import { AdaptivePolicyService } from "../../data/protocols/query-expansion-service.js";
import { AdaptivePolicy } from "../../domain/entities/index.js";

export class AdaptivePolicyServiceImpl implements AdaptivePolicyService {
  private readonly defaultPolicies: AdaptivePolicy[] = [
    {
      id: 'high-value-storage',
      name: 'Store High Value Content',
      description: 'Store content with high salience and success rate',
      conditions: {
        memory_type: ['episodic', 'skill', 'case'],
        salience_threshold: 0.7,
        age_threshold_days: 365,
        usage_threshold: 1,
      },
      actions: {
        store: true,
        summarize: false,
        merge_similar: false,
        archive: false,
        delete: false,
      },
      parameters: {
        similarity_threshold: 0.8,
        merge_confidence: 0.9,
        archive_after_days: 180,
      },
      stats: {
        applied_count: 0,
        last_applied: new Date(),
        effectiveness: 0.8,
      },
      metadata: {
        created: new Date(),
        updated: new Date(),
        active: true,
      },
    },
    {
      id: 'merge-similar-episodes',
      name: 'Merge Similar Episodes',
      description: 'Merge episodes that are very similar to avoid duplication',
      conditions: {
        memory_type: ['episodic'],
        salience_threshold: 0.4,
        age_threshold_days: 30,
        usage_threshold: 0,
      },
      actions: {
        store: true,
        summarize: true,
        merge_similar: true,
        archive: false,
        delete: false,
      },
      parameters: {
        similarity_threshold: 0.9,
        merge_confidence: 0.85,
        archive_after_days: 90,
      },
      stats: {
        applied_count: 0,
        last_applied: new Date(),
        effectiveness: 0.7,
      },
      metadata: {
        created: new Date(),
        updated: new Date(),
        active: true,
      },
    },
    {
      id: 'archive-old-low-value',
      name: 'Archive Old Low Value Content',
      description: 'Archive old content with low salience and usage',
      conditions: {
        memory_type: ['episodic', 'file'],
        salience_threshold: 0.3,
        age_threshold_days: 90,
        usage_threshold: 0,
      },
      actions: {
        store: false,
        summarize: true,
        merge_similar: false,
        archive: true,
        delete: false,
      },
      parameters: {
        similarity_threshold: 0.7,
        merge_confidence: 0.8,
        archive_after_days: 180,
      },
      stats: {
        applied_count: 0,
        last_applied: new Date(),
        effectiveness: 0.6,
      },
      metadata: {
        created: new Date(),
        updated: new Date(),
        active: true,
      },
    },
  ];

  async shouldStore(
    content: string,
    metadata: {
      type: string;
      salience?: number;
      complexity?: number;
      success?: boolean;
    }
  ): Promise<boolean> {
    const salience = metadata.salience || await this.calculateSalience(content, metadata);
    
    // Apply high-value storage policy
    const policy = this.defaultPolicies.find(p => p.id === 'high-value-storage');
    if (policy && policy.metadata.active) {
      const meets_threshold = salience >= policy.conditions.salience_threshold;
      const relevant_type = policy.conditions.memory_type.includes(metadata.type);
      
      if (meets_threshold && relevant_type) {
        await this.updatePolicyStats(policy.id, true);
        return true;
      }
    }

    // Fallback: store if salience is reasonable
    return salience > 0.4;
  }

  async shouldMerge(item1: any, item2: any, similarity: number): Promise<boolean> {
    const policy = this.defaultPolicies.find(p => p.id === 'merge-similar-episodes');
    if (!policy || !policy.metadata.active) return false;

    return similarity >= policy.parameters.similarity_threshold;
  }

  async shouldArchive(item: any, age_days: number, usage_count: number): Promise<boolean> {
    const policy = this.defaultPolicies.find(p => p.id === 'archive-old-low-value');
    if (!policy || !policy.metadata.active) return false;

    const salience = item.salience || item.metadata?.salience || 0.5;
    
    return (
      age_days >= policy.conditions.age_threshold_days &&
      salience <= policy.conditions.salience_threshold &&
      usage_count <= policy.conditions.usage_threshold
    );
  }

  async calculateSalience(
    content: string,
    context: {
      success?: boolean;
      complexity?: number;
      tools_used?: string[];
      duration?: number;
    }
  ): Promise<number> {
    let base_salience = 0.5;

    // Success boosts salience
    if (context.success === true) {
      base_salience += 0.2;
    } else if (context.success === false) {
      base_salience -= 0.1;
    }

    // Complexity affects salience
    if (context.complexity) {
      if (context.complexity >= 7) {
        base_salience += 0.2; // High complexity tasks are valuable
      } else if (context.complexity <= 3) {
        base_salience -= 0.1; // Low complexity tasks are less unique
      }
    }

    // Tool diversity indicates complexity
    if (context.tools_used && context.tools_used.length > 3) {
      base_salience += 0.1;
    }

    // Very long or very short duration affects salience
    if (context.duration) {
      if (context.duration > 300000) { // More than 5 minutes
        base_salience += 0.1; // Significant effort
      } else if (context.duration < 10000) { // Less than 10 seconds
        base_salience -= 0.1; // Trivial task
      }
    }

    // Content quality indicators
    if (content.length > 1000) {
      base_salience += 0.1; // Substantial content
    }

    return Math.min(1, Math.max(0, base_salience));
  }

  async updatePolicyEffectiveness(policyId: string, outcome: 'positive' | 'negative'): Promise<void> {
    const policy = this.defaultPolicies.find(p => p.id === policyId);
    if (!policy) return;

    // Update effectiveness using simple moving average
    const current_effectiveness = policy.stats.effectiveness;
    const outcome_value = outcome === 'positive' ? 1 : 0;
    const alpha = 0.1; // Learning rate

    policy.stats.effectiveness = current_effectiveness * (1 - alpha) + outcome_value * alpha;
    policy.stats.applied_count += 1;
    policy.stats.last_applied = new Date();
  }

  private async updatePolicyStats(policyId: string, applied: boolean): Promise<void> {
    const policy = this.defaultPolicies.find(p => p.id === policyId);
    if (!policy) return;

    policy.stats.applied_count += 1;
    policy.stats.last_applied = new Date();
  }

  // Getter for policies (for external access)
  getPolicies(): AdaptivePolicy[] {
    return [...this.defaultPolicies];
  }

  async updatePolicy(policyId: string, updates: Partial<AdaptivePolicy>): Promise<void> {
    const policy = this.defaultPolicies.find(p => p.id === policyId);
    if (!policy) return;

    Object.assign(policy, updates);
    policy.metadata.updated = new Date();
  }
}
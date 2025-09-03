export enum EpisodicType {
  TASK_COMPLETION = "task_completion",
  PROBLEM_SOLVING = "problem_solving", 
  LEARNING = "learning",
  ERROR_RESOLUTION = "error_resolution",
  INSIGHT = "insight",
  DECISION = "decision"
}

export enum SkillCategory {
  CODING = "coding",
  ANALYSIS = "analysis",
  DESIGN = "design",
  DEBUGGING = "debugging",
  OPTIMIZATION = "optimization",
  RESEARCH = "research",
  COMMUNICATION = "communication"
}

export interface EpisodicMemory {
  id: string;
  projectName: string;
  type: EpisodicType;
  title: string;
  description: string;
  context: {
    originalQuery?: string;
    files_involved: string[];
    tools_used: string[];
    duration_ms: number;
    success: boolean;
    error_messages?: string[];
  };
  outcome: {
    summary: string;
    lessons_learned: string[];
    solutions_applied: string[];
    patterns_identified: string[];
  };
  metadata: {
    created: Date;
    salience: number;        // 0-1, importance score
    complexity: number;      // 1-10, task complexity
    reusability: number;     // 0-1, how reusable is this knowledge
    tags: string[];
    related_episodes: string[]; // IDs of related episodes
  };
  embedding?: Float32Array;
}

export interface SkillDocument {
  id: string;
  category: SkillCategory;
  name: string;
  description: string;
  content: {
    principle: string;       // Core principle or rule
    examples: string[];      // Example applications
    patterns: string[];      // Common patterns to recognize
    antipatterns: string[];  // What to avoid
    prerequisites: string[]; // Required knowledge
    related_skills: string[]; // Related skill IDs
  };
  usage_stats: {
    times_applied: number;
    success_rate: number;
    last_used: Date;
    effectiveness_score: number; // 0-1, how effective this skill is
  };
  metadata: {
    created: Date;
    updated: Date;
    source_episodes: string[]; // Episodes that contributed to this skill
    confidence: number;        // 0-1, confidence in this skill
    tags: string[];
  };
  embedding?: Float32Array;
}

export interface CaseExample {
  id: string;
  projectName: string;
  original_problem: string;
  solution_approach: string;
  implementation_details: string;
  outcome: {
    success: boolean;
    performance_metrics?: Record<string, number>;
    issues_encountered: string[];
    lessons_learned: string[];
  };
  metadata: {
    created: Date;
    complexity: number;
    domain: string;          // Problem domain (e.g., "database", "api", "ui")
    patterns_used: string[]; // Design patterns applied
    tools_used: string[];
    reuse_count: number;     // How many times this case was referenced
    effectiveness_score: number;
  };
  embedding?: Float32Array;
}

export interface AdaptivePolicy {
  id: string;
  name: string;
  description: string;
  conditions: {
    memory_type: string[];   // Types of memory this applies to
    salience_threshold: number;
    age_threshold_days: number;
    usage_threshold: number;
  };
  actions: {
    store: boolean;          // Should store new memories matching conditions
    summarize: boolean;      // Should create summaries
    merge_similar: boolean;  // Should merge with similar memories
    archive: boolean;        // Should archive old memories
    delete: boolean;         // Should delete low-value memories
  };
  parameters: {
    similarity_threshold: number;
    merge_confidence: number;
    archive_after_days: number;
  };
  stats: {
    applied_count: number;
    last_applied: Date;
    effectiveness: number;   // 0-1, how well this policy works
  };
  metadata: {
    created: Date;
    updated: Date;
    active: boolean;
  };
}
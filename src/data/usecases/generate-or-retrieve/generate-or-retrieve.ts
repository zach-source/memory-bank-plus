import {
  GenerateOrRetrieveUseCase,
  ProblemContext,
  GenerateOrRetrieveDecision,
  CompressedSolution,
  GeneratedSolution,
  SolutionOutcome,
} from "../../../domain/usecases/generate-or-retrieve.js";
import {
  CaseExample,
} from "../../../domain/entities/index.js";
import {
  EpisodicMemoryRepository,
  LLMService,
  AdaptivePolicyService,
} from "../../protocols/index.js";

export class GenerateOrRetrieve implements GenerateOrRetrieveUseCase {
  constructor(
    private readonly episodicRepository: EpisodicMemoryRepository,
    private readonly llmService: LLMService,
    private readonly policyService: AdaptivePolicyService
  ) {}

  async shouldGenerate(
    problem: string,
    context: ProblemContext,
    confidence_threshold = 0.6
  ): Promise<GenerateOrRetrieveDecision> {
    // Find similar cases
    const similar_cases = await this.episodicRepository.findSimilarCases(
      problem,
      context.domain,
      5
    );

    if (similar_cases.length === 0) {
      return {
        decision: 'generate',
        confidence: 0.9,
        reasoning: 'No similar cases found - need to generate new solution',
        generation_context: {
          novel_aspects: [problem],
          reusable_components: [],
          estimated_success_rate: 0.5, // Unknown success rate for novel problems
        },
      };
    }

    // Calculate similarity and success metrics
    const best_case = similar_cases[0];
    const avg_effectiveness = similar_cases.reduce((sum, c) => sum + c.metadata.effectiveness_score, 0) / similar_cases.length;
    const case_success_rate = similar_cases.filter(c => c.outcome.success).length / similar_cases.length;

    // Decision logic
    let decision: 'generate' | 'retrieve' | 'hybrid' = 'retrieve';
    let confidence = avg_effectiveness * case_success_rate;

    if (confidence < confidence_threshold) {
      if (similar_cases.length >= 3 && case_success_rate > 0.5) {
        decision = 'hybrid'; // Use cases as inspiration but generate new approach
        confidence = Math.max(confidence, 0.6);
      } else {
        decision = 'generate';
        confidence = Math.max(confidence, 0.4);
      }
    }

    const reasoning = this.generateDecisionReasoning(decision, similar_cases, confidence);

    return {
      decision,
      confidence,
      reasoning,
      similar_cases: similar_cases.slice(0, 3),
      generation_context: decision !== 'retrieve' ? {
        novel_aspects: await this.identifyNovelAspects(problem, similar_cases),
        reusable_components: await this.identifyReusableComponents(similar_cases),
        estimated_success_rate: Math.max(0.3, case_success_rate * 0.8),
      } : undefined,
    };
  }

  async retrieveSimilarCases(
    problem: string,
    context: ProblemContext,
    limit = 5
  ): Promise<CaseExample[]> {
    return this.episodicRepository.findSimilarCases(problem, context.domain, limit);
  }

  async compressCaseToSolution(
    case_example: CaseExample,
    current_problem: string
  ): Promise<CompressedSolution> {
    // Extract key components from the case
    const approach = case_example.solution_approach;
    const steps = case_example.implementation_details.split('\n').filter(line => line.trim());
    
    // Identify adaptation needed
    const adaptation_notes = await this.generateAdaptationNotes(case_example, current_problem);

    return {
      approach,
      key_steps: steps.slice(0, 10), // Limit to key steps
      code_patterns: case_example.metadata.patterns_used,
      potential_issues: case_example.outcome.issues_encountered,
      adaptation_notes,
      confidence: case_example.metadata.effectiveness_score,
      original_case_id: case_example.id,
    };
  }

  async generateNewSolution(
    problem: string,
    context: ProblemContext,
    available_tools: string[]
  ): Promise<GeneratedSolution> {
    // Use LLM to generate solution plan
    const prompt = `Generate a solution plan for this problem:

Problem: ${problem}
Domain: ${context.domain}
Complexity: ${context.complexity}/10
Available tools: ${available_tools.join(', ')}
Constraints: ${context.constraints.join(', ')}

Provide a structured solution with:
1. Overall approach
2. Implementation steps (max 8)
3. Testing strategy
4. Risk assessment
5. Estimated effort`;

    try {
      const response = await this.llmService.summarize(prompt, {
        level: 'node' as any,
        type: 'abstractive' as any,
        maxTokens: 800,
        style: 'structured',
      });

      return this.parseSolutionResponse(response, context);
    } catch (error) {
      console.warn('Failed to generate solution:', error);
      return this.generateFallbackSolution(problem, context, available_tools);
    }
  }

  async evaluateAndStore(
    problem: string,
    solution: GeneratedSolution,
    outcome: SolutionOutcome
  ): Promise<CaseExample | null> {
    // Only store if solution was reasonably successful
    if (!outcome.success || outcome.user_satisfaction < 6) {
      return null;
    }

    const case_example: CaseExample = {
      id: `case-${Date.now()}-${this.generateHash(problem)}`,
      projectName: 'generated', // TODO: Extract from context
      original_problem: problem,
      solution_approach: solution.approach,
      implementation_details: solution.implementation_plan.join('\n'),
      outcome: {
        success: outcome.success,
        issues_encountered: outcome.issues_encountered,
        lessons_learned: outcome.lessons_learned,
        performance_metrics: outcome.performance_metrics,
      },
      metadata: {
        created: new Date(),
        complexity: Math.min(10, Math.max(1, solution.estimated_effort / 2)),
        domain: 'generated',
        patterns_used: [],
        tools_used: [],
        reuse_count: 0,
        effectiveness_score: Math.min(1, (outcome.user_satisfaction / 10) * (outcome.would_reuse ? 1.2 : 0.8)),
      },
    };

    await this.episodicRepository.storeCase(case_example);
    return case_example;
  }

  private async identifyNovelAspects(problem: string, existing_cases: CaseExample[]): Promise<string[]> {
    // Simple novelty detection
    const problem_words = problem.toLowerCase().split(/\s+/);
    const existing_words = existing_cases
      .flatMap(c => c.original_problem.toLowerCase().split(/\s+/));

    return problem_words.filter(word => 
      word.length > 3 && !existing_words.includes(word)
    ).slice(0, 5);
  }

  private async identifyReusableComponents(cases: CaseExample[]): Promise<string[]> {
    return cases
      .flatMap(c => c.metadata.patterns_used)
      .filter((pattern, index, arr) => arr.indexOf(pattern) === index) // Unique
      .slice(0, 5);
  }

  private generateDecisionReasoning(
    decision: 'generate' | 'retrieve' | 'hybrid',
    cases: CaseExample[],
    confidence: number
  ): string {
    switch (decision) {
      case 'retrieve':
        return `Found ${cases.length} similar cases with ${Math.round(confidence * 100)}% confidence. Best to adapt existing solution.`;
      case 'hybrid':
        return `Found ${cases.length} related cases but with ${Math.round(confidence * 100)}% confidence. Use as inspiration for new solution.`;
      case 'generate':
        return `${cases.length === 0 ? 'No similar cases' : 'Low confidence in existing cases'} - generate fresh solution.`;
    }
  }

  private async generateAdaptationNotes(case_example: CaseExample, current_problem: string): Promise<string[]> {
    return [
      `Adapt from: ${case_example.original_problem}`,
      `Consider: ${case_example.outcome.lessons_learned[0] || 'Previous implementation approach'}`,
      `Watch for: ${case_example.outcome.issues_encountered[0] || 'Similar complexity'}`,
    ];
  }

  private parseSolutionResponse(response: string, context: ProblemContext): GeneratedSolution {
    // Parse structured response (simplified)
    const lines = response.split('\n').filter(line => line.trim());
    
    return {
      approach: lines[0] || 'Generated approach',
      implementation_plan: lines.slice(1, 6).filter(line => line.includes('.')),
      testing_strategy: ['Unit tests', 'Integration tests'],
      risk_assessment: {
        risks: ['Implementation complexity', 'Integration challenges'],
        mitigations: ['Incremental development', 'Early testing'],
        confidence_level: 0.7,
      },
      estimated_effort: Math.max(1, context.complexity),
      success_probability: Math.max(0.3, 1 - (context.complexity / 15)),
    };
  }

  private generateFallbackSolution(
    problem: string,
    context: ProblemContext,
    available_tools: string[]
  ): GeneratedSolution {
    return {
      approach: `Systematic approach to: ${problem}`,
      implementation_plan: [
        'Analyze requirements',
        'Design solution architecture',
        'Implement core functionality',
        'Add tests',
        'Validate and iterate',
      ],
      testing_strategy: ['Unit testing', 'Integration testing'],
      risk_assessment: {
        risks: ['Complexity management', 'Integration challenges'],
        mitigations: ['Incremental development', 'Regular testing'],
        confidence_level: 0.5,
      },
      estimated_effort: context.complexity,
      success_probability: Math.max(0.4, 1 - (context.complexity / 12)),
    };
  }

  private generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
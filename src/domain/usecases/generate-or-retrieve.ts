import { CaseExample, RetrievalContext } from "../entities/index.js";

export interface GenerateOrRetrieveUseCase {
  /**
   * Decide whether to generate new solution or retrieve existing case
   */
  shouldGenerate(
    problem: string,
    context: ProblemContext,
    confidence_threshold?: number
  ): Promise<GenerateOrRetrieveDecision>;

  /**
   * Retrieve most similar solved cases
   */
  retrieveSimilarCases(
    problem: string,
    context: ProblemContext,
    limit?: number
  ): Promise<CaseExample[]>;

  /**
   * Compress retrieved case into actionable solution
   */
  compressCaseToSolution(
    case_example: CaseExample,
    current_problem: string
  ): Promise<CompressedSolution>;

  /**
   * Generate new solution when no good cases exist
   */
  generateNewSolution(
    problem: string,
    context: ProblemContext,
    available_tools: string[]
  ): Promise<GeneratedSolution>;

  /**
   * Evaluate solution quality and store as new case if successful
   */
  evaluateAndStore(
    problem: string,
    solution: GeneratedSolution,
    outcome: SolutionOutcome
  ): Promise<CaseExample | null>;
}

export interface ProblemContext {
  projectName: string;
  domain: string;            // e.g., "database", "api", "frontend"
  complexity: number;        // 1-10
  constraints: string[];     // Technical or business constraints
  available_tools: string[];
  similar_problems_solved: string[]; // IDs of related problems
  urgency: 'low' | 'medium' | 'high';
}

export interface GenerateOrRetrieveDecision {
  decision: 'generate' | 'retrieve' | 'hybrid';
  confidence: number;        // 0-1
  reasoning: string;
  similar_cases?: CaseExample[];
  generation_context?: {
    novel_aspects: string[];
    reusable_components: string[];
    estimated_success_rate: number;
  };
}

export interface CompressedSolution {
  approach: string;
  key_steps: string[];
  code_patterns: string[];
  potential_issues: string[];
  adaptation_notes: string[]; // How to adapt from original case
  confidence: number;
  original_case_id: string;
}

export interface GeneratedSolution {
  approach: string;
  implementation_plan: string[];
  code_templates?: string[];
  testing_strategy: string[];
  risk_assessment: {
    risks: string[];
    mitigations: string[];
    confidence_level: number;
  };
  estimated_effort: number;  // Hours or story points
  success_probability: number;
}

export interface SolutionOutcome {
  success: boolean;
  actual_effort: number;
  issues_encountered: string[];
  performance_metrics?: Record<string, number>;
  user_satisfaction: number; // 1-10
  lessons_learned: string[];
  would_reuse: boolean;
}
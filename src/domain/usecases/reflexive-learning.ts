import { EpisodicMemory, SkillDocument, CaseExample } from "../entities/index.js";

export interface ReflexiveLearningUseCase {
  /**
   * Capture learning from a completed task
   */
  captureTaskCompletion(task: TaskCompletionContext): Promise<EpisodicMemory>;

  /**
   * Extract and store skills from episodes
   */
  extractSkills(episodes: EpisodicMemory[]): Promise<SkillDocument[]>;

  /**
   * Create case examples from successful solutions
   */
  createCaseExample(episode: EpisodicMemory, solution_details: string): Promise<CaseExample>;

  /**
   * Generate lessons learned from failures
   */
  generateLessonsLearned(episode: EpisodicMemory): Promise<string[]>;

  /**
   * Identify reusable patterns from episodes
   */
  identifyPatterns(episodes: EpisodicMemory[]): Promise<PatternInsight[]>;
}

export interface TaskCompletionContext {
  query: string;
  projectName: string;
  tools_used: string[];
  files_modified: string[];
  duration_ms: number;
  success: boolean;
  error_messages?: string[];
  solution_steps: string[];
  outcomes: string[];
  user_feedback?: string;
}

export interface PatternInsight {
  pattern_name: string;
  description: string;
  examples: string[];
  conditions: string[];       // When this pattern applies
  benefits: string[];         // Why this pattern is useful
  risks: string[];           // What could go wrong
  confidence: number;         // 0-1, confidence in this pattern
  supporting_episodes: string[]; // Episode IDs that support this pattern
}
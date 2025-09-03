import { 
  EpisodicMemory, 
  SkillDocument, 
  CaseExample, 
  EpisodicType, 
  SkillCategory 
} from "../../domain/entities/index.js";

export interface EpisodicMemoryRepository {
  /**
   * Store a new episodic memory
   */
  storeEpisode(episode: EpisodicMemory): Promise<void>;

  /**
   * Get episodes by type
   */
  getEpisodesByType(projectName: string, type: EpisodicType, limit?: number): Promise<EpisodicMemory[]>;

  /**
   * Search episodes by similarity to a query
   */
  searchEpisodes(query: string, projectName?: string, limit?: number): Promise<EpisodicMemory[]>;

  /**
   * Get related episodes based on patterns or context
   */
  findRelatedEpisodes(episodeId: string, limit?: number): Promise<EpisodicMemory[]>;

  /**
   * Store a skill document
   */
  storeSkill(skill: SkillDocument): Promise<void>;

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: SkillCategory, limit?: number): Promise<SkillDocument[]>;

  /**
   * Search skills by query
   */
  searchSkills(query: string, limit?: number): Promise<SkillDocument[]>;

  /**
   * Update skill usage statistics
   */
  updateSkillUsage(skillId: string, success: boolean): Promise<void>;

  /**
   * Store a case example
   */
  storeCase(case_example: CaseExample): Promise<void>;

  /**
   * Find similar cases for a given problem
   */
  findSimilarCases(problem_description: string, domain?: string, limit?: number): Promise<CaseExample[]>;

  /**
   * Get most effective cases (high reuse, high success rate)
   */
  getMostEffectiveCases(domain?: string, limit?: number): Promise<CaseExample[]>;

  /**
   * Update case reuse statistics
   */
  updateCaseReuse(caseId: string): Promise<void>;

  /**
   * Get memory statistics
   */
  getMemoryStats(projectName?: string): Promise<{
    total_episodes: number;
    total_skills: number;
    total_cases: number;
    avg_salience: number;
    most_active_patterns: string[];
    recent_learnings: EpisodicMemory[];
  }>;
}
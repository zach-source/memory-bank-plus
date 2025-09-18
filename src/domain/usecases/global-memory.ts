import {
  GlobalMemory,
  GlobalMemoryType,
  GlobalMemoryQuery,
  GlobalMemoryInsight,
} from "../entities/global-memory.js";

export interface GlobalMemoryUseCase {
  /**
   * Store a lesson or insight that applies across projects
   */
  storeGlobalLesson(
    title: string,
    content: string,
    type: GlobalMemoryType,
    metadata: {
      tags: string[];
      salience: number;
      complexity: number;
      source_projects: string[];
    },
  ): Promise<GlobalMemory>;

  /**
   * Search global memories from any project context
   */
  searchGlobalMemories(query: GlobalMemoryQuery): Promise<GlobalMemory[]>;

  /**
   * Get contextual global memories for current project
   */
  getContextualMemories(
    current_project: string,
    context_query: string,
    limit?: number,
  ): Promise<GlobalMemory[]>;

  /**
   * Promote a project-specific memory to global scope
   */
  promoteToGlobal(
    project_name: string,
    file_name: string,
    global_type: GlobalMemoryType,
    additional_metadata?: {
      reusability_score?: number;
      applicability?: string[];
    },
  ): Promise<GlobalMemory>;

  /**
   * Get insights about how global memories apply to current project
   */
  getProjectRelevantInsights(
    project_name: string,
  ): Promise<GlobalMemoryInsight[]>;

  /**
   * Record successful application of global memory
   */
  recordGlobalMemoryApplication(
    memory_id: string,
    project_context: string,
    success: boolean,
    feedback?: string,
  ): Promise<void>;

  /**
   * Get most valuable global memories across all projects
   */
  getMostValuableGlobalMemories(limit?: number): Promise<GlobalMemory[]>;
}

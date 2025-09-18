import {
  GlobalMemory,
  GlobalMemoryType,
  GlobalMemoryQuery,
  GlobalMemoryInsight,
} from "../../domain/entities/global-memory.js";

export interface GlobalMemoryRepository {
  /**
   * Store a global memory that's accessible across all projects
   */
  storeGlobalMemory(memory: GlobalMemory): Promise<void>;

  /**
   * Search global memories across all projects
   */
  searchGlobalMemories(query: GlobalMemoryQuery): Promise<GlobalMemory[]>;

  /**
   * Get global memory by ID
   */
  getGlobalMemory(id: string): Promise<GlobalMemory | null>;

  /**
   * Get global memories by type
   */
  getGlobalMemoriesByType(
    type: GlobalMemoryType,
    limit?: number,
  ): Promise<GlobalMemory[]>;

  /**
   * Update global memory usage statistics when accessed
   */
  updateGlobalMemoryAccess(id: string, project_context?: string): Promise<void>;

  /**
   * Find related global memories based on content similarity
   */
  findRelatedGlobalMemories(
    memory_id: string,
    limit?: number,
  ): Promise<GlobalMemory[]>;

  /**
   * Get insights about global memory usage patterns
   */
  getGlobalMemoryInsights(
    project_context?: string,
  ): Promise<GlobalMemoryInsight[]>;

  /**
   * Get most valuable global memories (high reusability, frequent access)
   */
  getMostValuableMemories(limit?: number): Promise<GlobalMemory[]>;

  /**
   * Archive old or low-value global memories
   */
  archiveGlobalMemory(id: string): Promise<void>;

  /**
   * Get global memory statistics
   */
  getGlobalMemoryStats(): Promise<{
    total_memories: number;
    memories_by_type: Record<GlobalMemoryType, number>;
    avg_salience: number;
    avg_reusability: number;
    most_accessed: GlobalMemory[];
    recent_additions: GlobalMemory[];
  }>;
}

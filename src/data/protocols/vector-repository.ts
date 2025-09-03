import { EnhancedFile, SearchQuery, SearchResult } from "../../domain/entities/index.js";

export interface VectorRepository {
  /**
   * Initialize the vector database and create necessary tables/collections
   */
  initialize(): Promise<void>;

  /**
   * Store or update a file with its vector embedding
   */
  upsertFile(file: EnhancedFile): Promise<void>;

  /**
   * Delete a file from the vector database
   */
  deleteFile(projectName: string, fileName: string): Promise<void>;

  /**
   * Search for similar files using hybrid search
   * Combines semantic similarity with metadata-based ranking
   */
  search(query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Get embedding for text content
   */
  getEmbedding(text: string): Promise<Float32Array>;

  /**
   * Update file access statistics (for frequency tracking)
   */
  updateFileAccess(projectName: string, fileName: string): Promise<void>;

  /**
   * Get file statistics for a project
   */
  getProjectStats(projectName: string): Promise<{
    totalFiles: number;
    totalEmbeddings: number;
    lastUpdated: Date;
  }>;
}
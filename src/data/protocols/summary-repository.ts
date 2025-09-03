import { Summary, SummaryHierarchy, SummaryLevel } from "../../domain/entities/index.js";

export interface SummaryRepository {
  /**
   * Store or update a summary
   */
  upsertSummary(summary: Summary): Promise<void>;

  /**
   * Get a summary by ID
   */
  getSummary(id: string): Promise<Summary | null>;

  /**
   * Get all summaries for a project at a specific level
   */
  getSummariesByLevel(projectName: string, level: SummaryLevel): Promise<Summary[]>;

  /**
   * Get the complete hierarchy for a project
   */
  getProjectHierarchy(projectName: string): Promise<SummaryHierarchy | null>;

  /**
   * Delete a summary and update hierarchy
   */
  deleteSummary(id: string): Promise<void>;

  /**
   * Find summaries that need updating based on source file changes
   */
  findStalesSummaries(projectName: string, changedFiles: string[]): Promise<Summary[]>;

  /**
   * Get summaries by relevance to a query
   */
  searchSummaries(projectName: string, query: string, maxResults?: number): Promise<Summary[]>;

  /**
   * Get summary statistics for a project
   */
  getProjectSummaryStats(projectName: string): Promise<{
    totalSummaries: number;
    totalTokens: number;
    averageCompressionRatio: number;
    lastUpdated: Date;
  }>;
}
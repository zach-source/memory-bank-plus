import { Summary, SummaryHierarchy } from "../entities/index.js";

export interface CompileMemoryHierarchyUseCase {
  /**
   * Compile hierarchical summaries for a project
   */
  compileProject(projectName: string, options?: CompilationOptions): Promise<SummaryHierarchy>;

  /**
   * Update hierarchy when files change
   */
  updateHierarchy(projectName: string, changedFiles: string[]): Promise<SummaryHierarchy>;

  /**
   * Get optimal summary level for a given context budget
   */
  getOptimalSummaryLevel(projectName: string, maxTokens: number): Promise<Summary[]>;
}

export interface CompilationOptions {
  forceRecompile?: boolean;
  maxTokensPerSummary?: number;
  compressionRatio?: number;
  focusAreas?: string[];
}
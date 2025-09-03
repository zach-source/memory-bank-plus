import { ContextCompilation, ContextBudget } from "../entities/index.js";

export interface CompileContextUseCase {
  /**
   * Compile context from query with budget constraints
   */
  compileContext(
    query: string,
    budget: ContextBudget,
    options?: ContextCompilationOptions
  ): Promise<ContextCompilation>;

  /**
   * Get recommended budget for a query type
   */
  recommendBudget(query: string, contextType?: 'search' | 'summarization' | 'qa'): Promise<ContextBudget>;
}

export interface ContextCompilationOptions {
  projectName?: string;
  includeFiles?: boolean;
  includeSummaries?: boolean;
  compressionMethod?: 'llmlingua' | 'summarization' | 'extraction';
  prioritizeRecent?: boolean;
  maxRelevanceThreshold?: number;
}
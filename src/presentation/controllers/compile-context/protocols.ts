import { CompileContextUseCase } from "../../../domain/usecases/compile-context.js";
import { ContextCompilation, ContextBudget } from "../../../domain/entities/index.js";
import {
  Controller,
  Request,
  Response,
  Validator,
} from "../../protocols/index.js";

export interface CompileContextRequest {
  /**
   * The query to compile context for
   */
  query: string;

  /**
   * Maximum tokens for the compiled context
   */
  maxTokens?: number;

  /**
   * Reserved tokens for system prompts, etc.
   */
  reservedTokens?: number;

  /**
   * Target compression ratio if budget exceeded (0-1)
   */
  compressionTarget?: number;

  /**
   * Optional project name to scope the search
   */
  projectName?: string;

  /**
   * Include individual files in context
   */
  includeFiles?: boolean;

  /**
   * Include hierarchical summaries in context
   */
  includeSummaries?: boolean;

  /**
   * Compression method to use if needed
   */
  compressionMethod?: 'llmlingua' | 'summarization' | 'extraction';

  /**
   * Prioritize recent content
   */
  prioritizeRecent?: boolean;

  /**
   * Minimum relevance threshold (0-1)
   */
  maxRelevanceThreshold?: number;
}

export type CompileContextResponse = ContextCompilation;

export {
  Controller,
  Request,
  Response,
  CompileContextUseCase,
  ContextBudget,
  Validator,
};
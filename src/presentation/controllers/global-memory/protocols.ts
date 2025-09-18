import { GlobalMemoryUseCase } from "../../../domain/usecases/global-memory.js";
import {
  GlobalMemory,
  GlobalMemoryType,
  GlobalMemoryQuery,
  GlobalMemoryInsight,
} from "../../../domain/entities/global-memory.js";
import {
  Controller,
  Request,
  Response,
  Validator,
} from "../../protocols/index.js";

export interface StoreGlobalMemoryRequest {
  /**
   * Title of the global memory
   */
  title: string;

  /**
   * Content of the global memory
   */
  content: string;

  /**
   * Type of global memory
   */
  type: GlobalMemoryType;

  /**
   * Tags for categorization
   */
  tags: string[];

  /**
   * Salience score (0-1)
   */
  salience: number;

  /**
   * Complexity rating (1-10)
   */
  complexity: number;

  /**
   * Source projects that contributed to this memory
   */
  sourceProjects: string[];
}

export interface SearchGlobalMemoriesRequest {
  /**
   * Search query text
   */
  query: string;

  /**
   * Optional type filter
   */
  type?: GlobalMemoryType;

  /**
   * Optional tags filter
   */
  tags?: string[];

  /**
   * Minimum salience threshold
   */
  minSalience?: number;

  /**
   * Minimum reusability threshold
   */
  minReusability?: number;

  /**
   * Source projects filter
   */
  sourceProjects?: string[];

  /**
   * Projects to exclude
   */
  excludeProjects?: string[];

  /**
   * Maximum results
   */
  limit?: number;
}

export interface GetContextualMemoriesRequest {
  /**
   * Current project context
   */
  currentProject: string;

  /**
   * Context query for relevance
   */
  contextQuery: string;

  /**
   * Maximum results
   */
  limit?: number;
}

export interface PromoteToGlobalRequest {
  /**
   * Source project name
   */
  projectName: string;

  /**
   * Source file name
   */
  fileName: string;

  /**
   * Type for global memory
   */
  globalType: GlobalMemoryType;

  /**
   * Additional metadata
   */
  additionalMetadata?: {
    reusabilityScore?: number;
    applicability?: string[];
  };
}

export type StoreGlobalMemoryResponse = GlobalMemory;
export type SearchGlobalMemoriesResponse = GlobalMemory[];
export type GetContextualMemoriesResponse = GlobalMemory[];
export type PromoteToGlobalResponse = GlobalMemory;

export {
  Controller,
  GlobalMemoryUseCase,
  GlobalMemoryType,
  Request,
  Response,
  Validator,
};

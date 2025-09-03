import { SearchMemoryUseCase } from "../../../domain/usecases/search-memory.js";
import { SearchQuery, SearchResponse } from "../../../domain/entities/index.js";
import {
  Controller,
  Request,
  Response,
  Validator,
} from "../../protocols/index.js";

export interface SearchRequest {
  /**
   * The search query text
   */
  query: string;

  /**
   * Optional project name to scope the search
   */
  projectName?: string;

  /**
   * Optional tags to filter results
   */
  tags?: string[];

  /**
   * Maximum number of results to return (default: 20)
   */
  limit?: number;

  /**
   * Weight for semantic similarity score (default: 0.4)
   */
  semanticWeight?: number;

  /**
   * Weight for recency score (default: 0.2)
   */
  recencyWeight?: number;

  /**
   * Weight for frequency score (default: 0.2)
   */
  frequencyWeight?: number;

  /**
   * Weight for salience score (default: 0.2)
   */
  salienceWeight?: number;

  /**
   * Days for time decay calculation (default: 30)
   */
  timeDecayDays?: number;
}

export type SearchControllerResponse = SearchResponse;

export {
  Controller,
  Request,
  Response,
  SearchMemoryUseCase,
  SearchQuery,
  Validator,
};
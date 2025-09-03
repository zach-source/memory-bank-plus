import { SearchQuery, SearchResponse } from "../entities/index.js";

export interface SearchMemoryUseCase {
  search(query: SearchQuery): Promise<SearchResponse>;
}
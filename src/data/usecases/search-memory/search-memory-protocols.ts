import { SearchQuery, SearchResponse } from "../../../domain/entities/index.js";

export interface SearchMemoryRequest {
  query: SearchQuery;
}

export interface SearchMemoryResponse {
  searchResponse: SearchResponse;
}

export interface SearchMemoryProtocol {
  search(request: SearchMemoryRequest): Promise<SearchMemoryResponse>;
}
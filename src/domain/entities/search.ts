export interface SearchQuery {
  query: string;
  projectName?: string;
  tags?: string[];
  limit?: number;
  semanticWeight?: number;
  recencyWeight?: number;
  frequencyWeight?: number;
  salienceWeight?: number;
  timeDecayDays?: number;
}

export interface SearchResult {
  file: {
    name: string;
    projectName: string;
    content: string;
    metadata: {
      tags: string[];
      updated: Date;
      created: Date;
      task?: string;
      salience?: number;
      frequency?: number;
      lastAccessed?: Date;
    };
  };
  scores: {
    semantic: number;
    recency: number;
    frequency: number;
    salience: number;
    timeDecay: number;
    combined: number;
  };
  snippet?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  queryTime: number;
}
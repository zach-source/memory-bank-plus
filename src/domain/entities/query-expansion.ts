export interface QueryExpansion {
  original_query: string;
  expanded_queries: string[];
  hypothetical_answer: string;  // HyDE-style expansion
  generated_keywords: string[];
  semantic_variations: string[];
  expansion_method: 'hyde' | 'keyword' | 'semantic' | 'hybrid';
  confidence: number;           // 0-1, confidence in expansion quality
  created: Date;
}

export interface HyDEResult {
  original_query: string;
  hypothetical_document: string;
  key_concepts: string[];
  generated_at: Date;
  model_used: string;
  confidence_score: number;
}

export interface RetrievalContext {
  query: string;
  expansion: QueryExpansion;
  retrieved_items: Array<{
    id: string;
    content: string;
    score: number;
    source: 'file' | 'summary' | 'episode' | 'skill' | 'case';
    metadata: Record<string, any>;
  }>;
  total_results: number;
  retrieval_time_ms: number;
  retrieval_strategy: string;
}
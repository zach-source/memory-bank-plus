import { QueryExpansion, HyDEResult, RetrievalContext } from "../../domain/entities/index.js";

export interface QueryExpansionService {
  /**
   * Expand a query using HyDE (Hypothetical Document Embeddings)
   */
  expandWithHyDE(query: string, context?: string): Promise<HyDEResult>;

  /**
   * Generate semantic variations of the query
   */
  generateSemanticVariations(query: string, count?: number): Promise<string[]>;

  /**
   * Extract and expand keywords from the query
   */
  expandKeywords(query: string): Promise<string[]>;

  /**
   * Perform comprehensive query expansion
   */
  expandQuery(
    query: string, 
    method?: 'hyde' | 'keyword' | 'semantic' | 'hybrid',
    options?: {
      include_synonyms?: boolean;
      include_related_terms?: boolean;
      max_expansions?: number;
    }
  ): Promise<QueryExpansion>;

  /**
   * Evaluate expansion quality
   */
  evaluateExpansion(original: string, expanded: QueryExpansion): Promise<number>;
}

export interface AdaptivePolicyService {
  /**
   * Apply memory policies to determine what to store
   */
  shouldStore(
    content: string, 
    metadata: {
      type: string;
      salience?: number;
      complexity?: number;
      success?: boolean;
    }
  ): Promise<boolean>;

  /**
   * Apply policies to determine what to merge
   */
  shouldMerge(item1: any, item2: any, similarity: number): Promise<boolean>;

  /**
   * Apply policies to determine what to archive/delete
   */
  shouldArchive(item: any, age_days: number, usage_count: number): Promise<boolean>;

  /**
   * Calculate salience score for new content
   */
  calculateSalience(
    content: string,
    context: {
      success?: boolean;
      complexity?: number;
      tools_used?: string[];
      duration?: number;
    }
  ): Promise<number>;

  /**
   * Update policy effectiveness based on outcomes
   */
  updatePolicyEffectiveness(policyId: string, outcome: 'positive' | 'negative'): Promise<void>;
}
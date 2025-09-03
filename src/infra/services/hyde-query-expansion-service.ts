import {
  QueryExpansionService,
} from "../../data/protocols/query-expansion-service.js";
import {
  QueryExpansion,
  HyDEResult,
} from "../../domain/entities/index.js";
import { LLMService } from "../../data/protocols/llm-service.js";

export class HyDEQueryExpansionService implements QueryExpansionService {
  constructor(private readonly llmService: LLMService) {}

  async expandWithHyDE(query: string, context?: string): Promise<HyDEResult> {
    // Generate hypothetical document that would answer the query
    const prompt = `Generate a hypothetical document that would perfectly answer this query: "${query}"

${context ? `Additional context: ${context}` : ''}

Write 2-3 sentences that would be found in a document that answers this query. Focus on specific details, examples, and concrete information that would be relevant.

Document:`;

    try {
      const hypothetical_document = await this.llmService.summarize(prompt, {
        level: 'node' as any,
        type: 'abstractive' as any,
        maxTokens: 150,
        style: 'paragraph',
      });

      // Extract key concepts
      const key_concepts = await this.extractKeyConcepts(hypothetical_document);

      return {
        original_query: query,
        hypothetical_document,
        key_concepts,
        generated_at: new Date(),
        model_used: 'mock-llm', // In production, use actual model name
        confidence_score: 0.8, // Mock confidence
      };
    } catch (error) {
      console.warn('HyDE generation failed, using fallback:', error);
      return this.generateFallbackHyDE(query);
    }
  }

  async generateSemanticVariations(query: string, count = 5): Promise<string[]> {
    const variations: string[] = [];

    // Simple semantic variations (in production, use LLM)
    const synonyms = await this.getSynonyms(query);
    const relatedTerms = await this.getRelatedTerms(query);

    // Create variations by substitution
    variations.push(...this.createVariationsBySubstitution(query, synonyms));
    variations.push(...this.createVariationsByAddition(query, relatedTerms));

    // Deduplicate and limit
    const unique = [...new Set(variations)].filter(v => v !== query);
    return unique.slice(0, count);
  }

  async expandKeywords(query: string): Promise<string[]> {
    const words = query.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const expanded: string[] = [...words];

    // Add simple expansions
    for (const word of words) {
      const synonyms = await this.getWordSynonyms(word);
      expanded.push(...synonyms.slice(0, 2));
    }

    // Add domain-specific terms
    expanded.push(...this.getDomainTerms(query));

    return [...new Set(expanded)];
  }

  async expandQuery(
    query: string,
    method: 'hyde' | 'keyword' | 'semantic' | 'hybrid' = 'hybrid',
    options: {
      include_synonyms?: boolean;
      include_related_terms?: boolean;
      max_expansions?: number;
    } = {}
  ): Promise<QueryExpansion> {
    const {
      include_synonyms = true,
      include_related_terms = true,
      max_expansions = 10,
    } = options;

    let expanded_queries: string[] = [];
    let hypothetical_answer = '';
    let generated_keywords: string[] = [];
    let semantic_variations: string[] = [];

    switch (method) {
      case 'hyde':
        const hyde_result = await this.expandWithHyDE(query);
        hypothetical_answer = hyde_result.hypothetical_document;
        generated_keywords = hyde_result.key_concepts;
        expanded_queries = [hypothetical_answer];
        break;

      case 'keyword':
        generated_keywords = await this.expandKeywords(query);
        expanded_queries = generated_keywords.slice(0, max_expansions);
        break;

      case 'semantic':
        semantic_variations = await this.generateSemanticVariations(query, max_expansions);
        expanded_queries = semantic_variations;
        break;

      case 'hybrid':
        // Combine all methods
        const hyde = await this.expandWithHyDE(query);
        hypothetical_answer = hyde.hypothetical_document;
        generated_keywords = await this.expandKeywords(query);
        semantic_variations = await this.generateSemanticVariations(query, 5);
        
        expanded_queries = [
          hyde.hypothetical_document,
          ...semantic_variations,
          ...generated_keywords.slice(0, 3),
        ].slice(0, max_expansions);
        break;
    }

    return {
      original_query: query,
      expanded_queries: [...new Set(expanded_queries)],
      hypothetical_answer,
      generated_keywords: [...new Set(generated_keywords)],
      semantic_variations: [...new Set(semantic_variations)],
      expansion_method: method,
      confidence: this.calculateExpansionConfidence(expanded_queries, method),
      created: new Date(),
    };
  }

  async evaluateExpansion(original: string, expanded: QueryExpansion): Promise<number> {
    // Simple evaluation based on diversity and relevance
    const diversity = expanded.expanded_queries.length / 10; // Normalize by max expected
    const relevance = expanded.confidence;
    
    return Math.min(1, (diversity + relevance) / 2);
  }

  private async extractKeyConcepts(text: string): Promise<string[]> {
    // Simple keyword extraction (in production, use proper NLP)
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const filtered = words.filter(word => 
      !['that', 'this', 'with', 'from', 'they', 'were', 'been', 'have', 'will'].includes(word)
    );
    
    return [...new Set(filtered)].slice(0, 8);
  }

  private generateFallbackHyDE(query: string): HyDEResult {
    const fallback_document = `The solution to "${query}" involves systematic analysis and implementation of best practices. This typically requires understanding the requirements, designing an appropriate approach, and implementing with proper testing.`;

    return {
      original_query: query,
      hypothetical_document: fallback_document,
      key_concepts: ['solution', 'analysis', 'implementation', 'testing'],
      generated_at: new Date(),
      model_used: 'fallback',
      confidence_score: 0.5,
    };
  }

  private async getSynonyms(query: string): Promise<string[]> {
    // Mock synonym generation (replace with actual thesaurus API)
    const word_synonyms: Record<string, string[]> = {
      'implement': ['create', 'build', 'develop', 'code'],
      'fix': ['repair', 'resolve', 'solve', 'debug'],
      'optimize': ['improve', 'enhance', 'speed up', 'refactor'],
      'add': ['include', 'insert', 'append', 'create'],
      'remove': ['delete', 'eliminate', 'drop', 'exclude'],
    };

    return Object.entries(word_synonyms)
      .filter(([word]) => query.toLowerCase().includes(word))
      .flatMap(([_, synonyms]) => synonyms);
  }

  private async getRelatedTerms(query: string): Promise<string[]> {
    // Mock related term generation
    const domain_terms: Record<string, string[]> = {
      'database': ['schema', 'query', 'migration', 'index'],
      'api': ['endpoint', 'route', 'middleware', 'authentication'],
      'frontend': ['component', 'state', 'props', 'render'],
      'testing': ['unit', 'integration', 'mock', 'assertion'],
    };

    return Object.entries(domain_terms)
      .filter(([domain]) => query.toLowerCase().includes(domain))
      .flatMap(([_, terms]) => terms);
  }

  private createVariationsBySubstitution(query: string, synonyms: string[]): string[] {
    const variations: string[] = [];
    
    for (const synonym of synonyms.slice(0, 3)) {
      // Simple word replacement
      const words = query.split(' ');
      for (let i = 0; i < words.length; i++) {
        const variation = [...words];
        variation[i] = synonym;
        variations.push(variation.join(' '));
      }
    }

    return variations;
  }

  private createVariationsByAddition(query: string, related_terms: string[]): string[] {
    return related_terms.slice(0, 3).map(term => `${query} ${term}`);
  }

  private async getWordSynonyms(word: string): Promise<string[]> {
    // Mock word synonyms
    const simple_synonyms: Record<string, string[]> = {
      'create': ['make', 'build'],
      'build': ['create', 'construct'],
      'test': ['verify', 'check'],
      'fix': ['repair', 'solve'],
    };

    return simple_synonyms[word] || [];
  }

  private getDomainTerms(query: string): string[] {
    const queryLower = query.toLowerCase();
    const terms: string[] = [];

    if (queryLower.includes('database') || queryLower.includes('sql')) {
      terms.push('schema', 'migration', 'query', 'index');
    }
    if (queryLower.includes('api') || queryLower.includes('rest')) {
      terms.push('endpoint', 'route', 'middleware');
    }
    if (queryLower.includes('test') || queryLower.includes('spec')) {
      terms.push('unit', 'integration', 'mock');
    }

    return terms;
  }

  private calculateExpansionConfidence(expanded_queries: string[], method: string): number {
    let base_confidence = 0.6;

    // Boost confidence based on expansion count
    if (expanded_queries.length >= 5) base_confidence += 0.2;
    if (expanded_queries.length >= 8) base_confidence += 0.1;

    // Method-specific adjustments
    switch (method) {
      case 'hyde':
        base_confidence += 0.2; // HyDE is generally effective
        break;
      case 'hybrid':
        base_confidence += 0.1; // Hybrid combines strengths
        break;
    }

    return Math.min(1, base_confidence);
  }
}
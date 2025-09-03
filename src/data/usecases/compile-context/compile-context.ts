import {
  CompileContextUseCase,
  ContextCompilationOptions,
} from "../../../domain/usecases/compile-context.js";
import {
  ContextCompilation,
  ContextBudget,
  ContextItem,
  CompressionResult,
} from "../../../domain/entities/index.js";
import {
  VectorRepository,
  SummaryRepository,
  LLMService,
} from "../../protocols/index.js";

export class CompileContext implements CompileContextUseCase {
  constructor(
    private readonly vectorRepository: VectorRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly llmService: LLMService
  ) {}

  async compileContext(
    query: string,
    budget: ContextBudget,
    options: ContextCompilationOptions = {}
  ): Promise<ContextCompilation> {
    const startTime = Date.now();
    
    const {
      projectName,
      includeFiles = true,
      includeSummaries = true,
      compressionMethod = 'llmlingua',
      prioritizeRecent = true,
      maxRelevanceThreshold = 0.5,
    } = options;

    // Step 1: Gather candidate items
    const candidates = await this.gatherCandidates(
      query,
      projectName,
      includeFiles,
      includeSummaries
    );

    // Step 2: Score and filter by relevance
    const relevantItems = candidates
      .filter(item => item.relevanceScore >= maxRelevanceThreshold)
      .sort((a, b) => {
        if (prioritizeRecent && a.metadata.lastAccessed && b.metadata.lastAccessed) {
          const recencyDiff = b.metadata.lastAccessed.getTime() - a.metadata.lastAccessed.getTime();
          if (Math.abs(recencyDiff) > 86400000) { // More than 1 day difference
            return recencyDiff > 0 ? 1 : -1;
          }
        }
        // Otherwise sort by relevance * importance
        return (b.relevanceScore * b.metadata.importance) - (a.relevanceScore * a.metadata.importance);
      });

    // Step 3: Select items within budget
    const selectedItems = await this.selectItemsWithinBudget(
      relevantItems,
      budget,
      compressionMethod
    );

    // Step 4: Apply compression if needed
    let compressionApplied = false;
    let compressionRatio: number | undefined;
    
    const totalTokens = selectedItems.reduce((sum, item) => sum + item.tokens, 0);
    
    if (totalTokens > budget.availableTokens) {
      const compressionResult = await this.compressContent(
        selectedItems,
        budget,
        compressionMethod
      );
      
      // Update items with compressed content
      for (let i = 0; i < selectedItems.length; i++) {
        selectedItems[i].content = compressionResult.compressedItems[i];
        selectedItems[i].tokens = compressionResult.compressedTokens[i];
      }
      
      compressionApplied = true;
      compressionRatio = compressionResult.overallCompressionRatio;
    }

    const compilation: ContextCompilation = {
      id: this.generateCompilationId(query),
      query,
      budget,
      items: selectedItems,
      totalTokens: selectedItems.reduce((sum, item) => sum + item.tokens, 0),
      compressionApplied,
      compressionRatio,
      compilationTime: Date.now() - startTime,
      created: new Date(),
    };

    return compilation;
  }

  async recommendBudget(
    query: string,
    contextType: 'search' | 'summarization' | 'qa' = 'search'
  ): Promise<ContextBudget> {
    const queryTokens = await this.llmService.countTokens(query);
    
    // Base budgets by context type
    let maxTokens: number;
    let reservedTokens: number;
    
    switch (contextType) {
      case 'search':
        maxTokens = 4000;
        reservedTokens = 500 + queryTokens;
        break;
      case 'summarization':
        maxTokens = 8000;
        reservedTokens = 1000 + queryTokens;
        break;
      case 'qa':
        maxTokens = 6000;
        reservedTokens = 800 + queryTokens;
        break;
    }

    return {
      maxTokens,
      reservedTokens,
      availableTokens: maxTokens - reservedTokens,
      usedTokens: 0,
      compressionTarget: 0.3, // Target 30% compression if needed
    };
  }

  private async gatherCandidates(
    query: string,
    projectName?: string,
    includeFiles = true,
    includeSummaries = true
  ): Promise<ContextItem[]> {
    const candidates: ContextItem[] = [];

    // Get relevant files through vector search
    if (includeFiles) {
      const searchResults = await this.vectorRepository.search({
        query,
        projectName,
        limit: 20,
        semanticWeight: 0.8,
        recencyWeight: 0.2,
      });

      for (const result of searchResults) {
        candidates.push({
          id: `${result.file.projectName}:${result.file.name}`,
          content: result.file.content,
          tokens: await this.llmService.countTokens(result.file.content),
          relevanceScore: result.scores.semantic,
          type: 'file',
          metadata: {
            projectName: result.file.projectName,
            fileName: result.file.name,
            lastAccessed: result.file.metadata.lastAccessed,
            importance: result.file.metadata.salience || 0.5,
          },
        });
      }
    }

    // Get relevant summaries
    if (includeSummaries && projectName) {
      const summaries = await this.summaryRepository.searchSummaries(
        projectName,
        query,
        10
      );

      for (const summary of summaries) {
        // Calculate relevance score (simplified)
        const relevanceScore = await this.calculateSummaryRelevance(summary.content, query);
        
        candidates.push({
          id: summary.id,
          content: summary.content,
          tokens: summary.metadata.tokens,
          relevanceScore,
          type: 'summary',
          metadata: {
            projectName: summary.projectName,
            summaryLevel: summary.metadata.level,
            importance: 0.7, // Summaries are generally important
          },
        });
      }
    }

    return candidates;
  }

  private async selectItemsWithinBudget(
    items: ContextItem[],
    budget: ContextBudget,
    compressionMethod: string
  ): Promise<ContextItem[]> {
    const selected: ContextItem[] = [];
    let remainingTokens = budget.availableTokens;

    for (const item of items) {
      if (item.tokens <= remainingTokens) {
        selected.push(item);
        remainingTokens -= item.tokens;
      } else if (compressionMethod !== 'truncation') {
        // Try to include item with compression
        const compressionTarget = remainingTokens / item.tokens;
        if (compressionTarget >= 0.2) { // Don't compress more than 80%
          selected.push(item);
          remainingTokens = 0;
          break;
        }
      }

      if (remainingTokens <= 0) break;
    }

    return selected;
  }

  private async compressContent(
    items: ContextItem[],
    budget: ContextBudget,
    method: string
  ): Promise<{
    compressedItems: string[];
    compressedTokens: number[];
    overallCompressionRatio: number;
  }> {
    const compressedItems: string[] = [];
    const compressedTokens: number[] = [];
    const totalOriginalTokens = items.reduce((sum, item) => sum + item.tokens, 0);

    const targetTokens = budget.availableTokens;
    const compressionRatio = targetTokens / totalOriginalTokens;

    for (const item of items) {
      const targetItemTokens = Math.floor(item.tokens * compressionRatio);
      
      try {
        const compressionResult = await this.llmService.compress(item.content, {
          targetTokens: targetItemTokens,
          method: method === 'aggressive' ? 'aggressive' : 'balanced',
          maintainCoherence: true,
        });
        
        compressedItems.push(compressionResult.compressedContent);
        compressedTokens.push(compressionResult.compressedTokens);
      } catch (error) {
        console.warn('Compression failed, using truncation:', error);
        // Fallback to simple truncation
        const truncated = item.content.substring(0, Math.floor(item.content.length * compressionRatio));
        compressedItems.push(truncated);
        compressedTokens.push(await this.llmService.countTokens(truncated));
      }
    }

    const totalCompressedTokens = compressedTokens.reduce((sum, tokens) => sum + tokens, 0);
    const actualCompressionRatio = totalCompressedTokens / totalOriginalTokens;

    return {
      compressedItems,
      compressedTokens,
      overallCompressionRatio: actualCompressionRatio,
    };
  }

  private async calculateSummaryRelevance(summaryContent: string, query: string): Promise<number> {
    // Simple keyword-based relevance for now
    const queryWords = query.toLowerCase().split(/\s+/);
    const summaryWords = summaryContent.toLowerCase().split(/\s+/);
    
    const matches = queryWords.filter(word => 
      summaryWords.some(summaryWord => summaryWord.includes(word))
    );
    
    return matches.length / queryWords.length;
  }

  private generateCompilationId(query: string): string {
    const timestamp = Date.now();
    const queryHash = this.simpleHash(query);
    return `compilation-${queryHash}-${timestamp}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
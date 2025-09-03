import {
  LLMService,
  SummarizationOptions,
  CompressionOptions,
} from "../../data/protocols/llm-service.js";
import {
  CompressionResult,
  SummaryLevel,
  SummaryType,
} from "../../domain/entities/index.js";

/**
 * Mock LLM service for development and testing
 * In production, this would be replaced with actual LLM integration
 */
export class MockLLMService implements LLMService {
  private readonly wordsPerToken = 0.75; // Rough estimate
  
  async summarize(content: string, options: SummarizationOptions): Promise<string> {
    const { level, type, maxTokens = 1000, style = 'paragraph', focusAreas = [] } = options;
    
    // Simple extractive summarization by taking first sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const targetSentences = Math.ceil(maxTokens * this.wordsPerToken / 20); // ~20 words per sentence
    
    let summary = sentences.slice(0, targetSentences).join('. ').trim();
    if (summary && !summary.endsWith('.')) {
      summary += '.';
    }

    // Add level-specific formatting
    switch (level) {
      case SummaryLevel.PROJECT:
        summary = `# Project Overview\n\n${summary}`;
        break;
      case SummaryLevel.SECTION:
        summary = `## Section Summary\n\n${summary}`;
        break;
      case SummaryLevel.NODE:
        if (style === 'bullet-points') {
          const points = summary.split('. ').filter(p => p.trim());
          summary = points.map(p => `• ${p.trim()}`).join('\n');
        }
        break;
    }

    // Add focus areas if provided
    if (focusAreas.length > 0) {
      const focusText = `\n\n**Key Focus Areas**: ${focusAreas.join(', ')}`;
      summary += focusText;
    }

    return summary || content.substring(0, maxTokens * this.wordsPerToken);
  }

  async compress(content: string, options: CompressionOptions): Promise<CompressionResult> {
    const {
      targetTokens,
      compressionRatio = 0.5,
      preserveKeywords = [],
      method = 'balanced',
      maintainCoherence = true,
    } = options;

    const originalTokens = await this.countTokens(content);
    const actualTargetTokens = targetTokens || Math.floor(originalTokens * compressionRatio);
    
    // Simple compression: keep important sentences and keywords
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const targetSentenceCount = Math.max(1, Math.floor(sentences.length * compressionRatio));
    
    let selectedSentences: string[] = [];
    
    // Prioritize sentences with keywords
    if (preserveKeywords.length > 0) {
      const keywordSentences = sentences.filter(sentence =>
        preserveKeywords.some(keyword => 
          sentence.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      selectedSentences = keywordSentences.slice(0, Math.floor(targetSentenceCount / 2));
    }
    
    // Fill remaining with first sentences
    const remainingCount = targetSentenceCount - selectedSentences.length;
    const additionalSentences = sentences
      .filter(s => !selectedSentences.includes(s))
      .slice(0, remainingCount);
    
    selectedSentences = [...selectedSentences, ...additionalSentences];
    
    let compressedContent = selectedSentences.join('. ').trim();
    if (compressedContent && !compressedContent.endsWith('.')) {
      compressedContent += '.';
    }

    const compressedTokens = await this.countTokens(compressedContent);
    const actualCompressionRatio = compressedTokens / originalTokens;

    // Add ellipsis if content was significantly compressed
    if (actualCompressionRatio < 0.7 && maintainCoherence) {
      compressedContent += '\n\n[Content compressed - full details available in source]';
    }

    return {
      originalContent: content,
      compressedContent,
      originalTokens,
      compressedTokens,
      compressionRatio: actualCompressionRatio,
      method: 'extraction', // Our mock method
      quality: Math.max(0.3, 1 - (1 - actualCompressionRatio) * 1.5), // Rough quality estimate
    };
  }

  async countTokens(content: string): Promise<number> {
    // Simple token estimation: ~0.75 tokens per word
    const words = content.split(/\s+/).length;
    return Math.ceil(words * this.wordsPerToken);
  }

  async getEmbedding(text: string): Promise<Float32Array> {
    // Generate a consistent but fake embedding
    const embedding = new Float32Array(384);
    const textBytes = new TextEncoder().encode(text);
    
    for (let i = 0; i < embedding.length; i++) {
      let hash = 0;
      for (let j = 0; j < textBytes.length; j++) {
        hash = ((hash << 5) - hash + textBytes[j]) & 0xffffffff;
      }
      embedding[i] = (hash % 1000) / 1000 - 0.5;
      hash = hash * 31 + i; // Add position information
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
    
    return embedding;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock service is always available
  }
}
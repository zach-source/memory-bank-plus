import { Summary, SummaryLevel, SummaryType, CompressionResult } from "../../domain/entities/index.js";

export interface LLMService {
  /**
   * Generate a summary for given content
   */
  summarize(content: string, options: SummarizationOptions): Promise<string>;

  /**
   * Compress text content using LLMLingua-2 style compression
   */
  compress(content: string, options: CompressionOptions): Promise<CompressionResult>;

  /**
   * Count tokens in text content
   */
  countTokens(content: string): Promise<number>;

  /**
   * Generate embeddings for text (if the service supports it)
   */
  getEmbedding?(text: string): Promise<Float32Array>;

  /**
   * Check if the service is available and configured
   */
  isAvailable(): Promise<boolean>;
}

export interface SummarizationOptions {
  level: SummaryLevel;
  type: SummaryType;
  maxTokens?: number;
  style?: 'bullet-points' | 'paragraph' | 'structured';
  preserveStructure?: boolean;
  focusAreas?: string[]; // Keywords to emphasize
}

export interface CompressionOptions {
  targetTokens?: number;
  compressionRatio?: number;
  preserveKeywords?: string[];
  method?: 'aggressive' | 'balanced' | 'conservative';
  maintainCoherence?: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}
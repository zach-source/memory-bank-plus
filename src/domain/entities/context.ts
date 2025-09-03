export interface ContextBudget {
  maxTokens: number;
  reservedTokens: number;      // For system prompts, etc.
  availableTokens: number;     // maxTokens - reservedTokens
  usedTokens: number;
  compressionTarget: number;   // Target compression ratio (0-1)
}

export interface ContextItem {
  id: string;
  content: string;
  tokens: number;
  relevanceScore: number;
  type: 'file' | 'summary' | 'snippet';
  metadata: {
    projectName: string;
    fileName?: string;
    summaryLevel?: string;
    lastAccessed?: Date;
    importance: number;        // 0-1, higher = more important
  };
}

export interface ContextCompilation {
  id: string;
  query: string;
  budget: ContextBudget;
  items: ContextItem[];
  totalTokens: number;
  compressionApplied: boolean;
  compressionRatio?: number;
  compilationTime: number;
  created: Date;
}

export interface CompressionResult {
  originalContent: string;
  compressedContent: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  method: 'llmlingua' | 'summarization' | 'extraction' | 'truncation';
  quality: number; // 0-1, estimated quality retention
}
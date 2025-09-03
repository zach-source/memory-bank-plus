export enum SummaryLevel {
  NODE = "node",       // Individual file/chunk level
  SECTION = "section", // Group of related files
  PROJECT = "project"  // Entire project overview
}

export enum SummaryType {
  EXTRACTIVE = "extractive",     // Key sentences/paragraphs extracted
  ABSTRACTIVE = "abstractive",   // Generated summary text
  HIERARCHICAL = "hierarchical"  // Multi-level structured summary
}

export interface SummaryMetadata {
  level: SummaryLevel;
  type: SummaryType;
  sourceFiles: string[];
  tokens: number;
  compressionRatio: number;
  created: Date;
  updated: Date;
  parentSummaryId?: string;
  childSummaryIds: string[];
}

export interface Summary {
  id: string;
  projectName: string;
  content: string;
  metadata: SummaryMetadata;
  embedding?: Float32Array;
}

export interface SummaryHierarchy {
  projectName: string;
  rootSummary: Summary;
  sections: Summary[];
  nodes: Summary[];
  totalTokens: number;
  compressionRatio: number;
  lastUpdated: Date;
}
export interface GlobalMemory {
  id: string;
  type: GlobalMemoryType;
  title: string;
  content: string;
  metadata: {
    tags: string[];
    created: Date;
    updated: Date;
    salience: number;
    complexity: number;
    reusability: number;
    source_projects: string[]; // Projects that contributed to this memory
    usage_count: number;
    last_accessed: Date;
  };
  relationships: {
    related_memories: string[]; // IDs of related global memories
    derived_from: string[]; // Source memory/episode IDs
    applied_to_projects: string[]; // Projects where this was useful
  };
  embedding?: Float32Array;
}

export enum GlobalMemoryType {
  LESSON = "lesson", // Important lessons learned
  PRINCIPLE = "principle", // Core principles and guidelines
  PATTERN = "pattern", // Reusable implementation patterns
  ANTIPATTERN = "antipattern", // What to avoid
  BEST_PRACTICE = "best_practice", // Proven approaches
  INSIGHT = "insight", // Deep technical insights
  REFERENCE = "reference", // Important reference material
  DECISION = "decision", // Architectural decisions with rationale
  TEMPLATE = "template", // Reusable code/doc templates
}

export interface GlobalMemoryQuery {
  query: string;
  type?: GlobalMemoryType;
  tags?: string[];
  min_salience?: number;
  min_reusability?: number;
  source_projects?: string[];
  exclude_projects?: string[];
  limit?: number;
}

export interface GlobalMemoryInsight {
  memory_id: string;
  insight_type: "application" | "evolution" | "connection";
  description: string;
  confidence: number;
  evidence: string[];
  suggested_actions: string[];
}

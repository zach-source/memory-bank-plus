import { QdrantClient } from "@qdrant/js-client-rest";
import { GlobalMemoryRepository } from "../../data/protocols/global-memory-repository.js";
import {
  GlobalMemory,
  GlobalMemoryType,
  GlobalMemoryQuery,
  GlobalMemoryInsight,
} from "../../domain/entities/global-memory.js";

interface QdrantConfig {
  url?: string;
  host?: string;
  port?: number;
  apiKey?: string;
}

interface GlobalMemoryPoint {
  id: string;
  vector: number[];
  payload: {
    type: string;
    title: string;
    content: string;
    tags: string[];
    created: string;
    updated: string;
    salience: number;
    complexity: number;
    reusability: number;
    source_projects: string[];
    usage_count: number;
    last_accessed: string;
    related_memories: string[];
    derived_from: string[];
    applied_to_projects: string[];
  };
}

export class QdrantGlobalMemoryRepository implements GlobalMemoryRepository {
  private client: QdrantClient;
  private collectionName = "memory_bank_global";
  private initialized = false;

  constructor(private readonly config: QdrantConfig = {}) {
    const clientConfig = {
      url:
        config.url ||
        `http://${config.host || "localhost"}:${config.port || 6333}`,
      ...(config.apiKey && { apiKey: config.apiKey }),
    };

    this.client = new QdrantClient(clientConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections?.some(
        (collection) => collection.name === this.collectionName,
      );

      if (!collectionExists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 384,
            distance: "Cosine",
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        // Create indices for efficient global memory queries
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "type",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "tags",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "salience",
          field_schema: "float",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "reusability",
          field_schema: "float",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "source_projects",
          field_schema: "keyword",
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize global memory collection:", error);
      throw new Error(`Failed to initialize global memory database: ${error}`);
    }
  }

  async storeGlobalMemory(memory: GlobalMemory): Promise<void> {
    await this.initialize();

    const point: GlobalMemoryPoint = {
      id: memory.id,
      vector: memory.embedding
        ? Array.from(memory.embedding)
        : new Array(384).fill(0),
      payload: {
        type: memory.type,
        title: memory.title,
        content: memory.content,
        tags: memory.metadata.tags,
        created: memory.metadata.created.toISOString(),
        updated: memory.metadata.updated.toISOString(),
        salience: memory.metadata.salience,
        complexity: memory.metadata.complexity,
        reusability: memory.metadata.reusability,
        source_projects: memory.metadata.source_projects,
        usage_count: memory.metadata.usage_count,
        last_accessed: memory.metadata.last_accessed.toISOString(),
        related_memories: memory.relationships.related_memories,
        derived_from: memory.relationships.derived_from,
        applied_to_projects: memory.relationships.applied_to_projects,
      },
    };

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [point],
    });
  }

  async searchGlobalMemories(
    query: GlobalMemoryQuery,
  ): Promise<GlobalMemory[]> {
    await this.initialize();

    // Build filter conditions
    const filter: any = {
      must: [],
    };

    if (query.type) {
      filter.must.push({
        key: "type",
        match: { value: query.type },
      });
    }

    if (query.tags && query.tags.length > 0) {
      filter.must.push({
        key: "tags",
        match: { any: query.tags },
      });
    }

    if (query.min_salience !== undefined) {
      filter.must.push({
        key: "salience",
        range: { gte: query.min_salience },
      });
    }

    if (query.min_reusability !== undefined) {
      filter.must.push({
        key: "reusability",
        range: { gte: query.min_reusability },
      });
    }

    if (query.source_projects && query.source_projects.length > 0) {
      filter.must.push({
        key: "source_projects",
        match: { any: query.source_projects },
      });
    }

    if (query.exclude_projects && query.exclude_projects.length > 0) {
      filter.must_not = [
        {
          key: "source_projects",
          match: { any: query.exclude_projects },
        },
      ];
    }

    // Generate query embedding for semantic search
    const queryEmbedding = new Array(384).fill(0); // Mock embedding - replace with actual

    const searchResult = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: query.limit || 20,
      filter: filter.must.length > 0 || filter.must_not ? filter : undefined,
      with_payload: true,
    });

    return searchResult.map((point) => this.mapPointToGlobalMemory(point));
  }

  async getGlobalMemory(id: string): Promise<GlobalMemory | null> {
    await this.initialize();

    const points = await this.client.retrieve(this.collectionName, {
      ids: [id],
      with_payload: true,
      with_vector: true,
    });

    if (points.length === 0) return null;

    return this.mapPointToGlobalMemory(points[0]);
  }

  async getGlobalMemoriesByType(
    type: GlobalMemoryType,
    limit = 20,
  ): Promise<GlobalMemory[]> {
    const query: GlobalMemoryQuery = {
      query: "", // Empty query for type-based search
      type,
      limit,
    };

    return this.searchGlobalMemories(query);
  }

  async updateGlobalMemoryAccess(
    id: string,
    project_context?: string,
  ): Promise<void> {
    await this.initialize();

    const points = await this.client.retrieve(this.collectionName, {
      ids: [id],
      with_payload: true,
      with_vector: true,
    });

    if (points.length === 0) return;

    const point = points[0];
    const payload = point.payload as any;

    // Update access information
    payload.last_accessed = new Date().toISOString();
    payload.usage_count = (payload.usage_count || 0) + 1;

    // Add to applied projects if not already there
    if (
      project_context &&
      !payload.applied_to_projects.includes(project_context)
    ) {
      payload.applied_to_projects.push(project_context);
    }

    const vectorData = Array.isArray(point.vector) ? point.vector : [];
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector: vectorData,
          payload,
        },
      ],
    });
  }

  async findRelatedGlobalMemories(
    memory_id: string,
    limit = 5,
  ): Promise<GlobalMemory[]> {
    await this.initialize();

    const memory = await this.getGlobalMemory(memory_id);
    if (!memory || !memory.embedding) return [];

    // Search for similar memories
    const searchResult = await this.client.search(this.collectionName, {
      vector: Array.from(memory.embedding),
      limit: limit + 1, // +1 to exclude the original
      with_payload: true,
    });

    return searchResult
      .filter((point) => point.id !== memory_id)
      .slice(0, limit)
      .map((point) => this.mapPointToGlobalMemory(point));
  }

  async getGlobalMemoryInsights(
    project_context?: string,
  ): Promise<GlobalMemoryInsight[]> {
    await this.initialize();

    // Get memories relevant to project context
    const query: GlobalMemoryQuery = {
      query: project_context || "",
      source_projects: project_context ? [project_context] : undefined,
      min_salience: 0.7,
      limit: 10,
    };

    const memories = await this.searchGlobalMemories(query);
    const insights: GlobalMemoryInsight[] = [];

    for (const memory of memories) {
      // Generate insights about how this memory could be applied
      insights.push({
        memory_id: memory.id,
        insight_type: "application",
        description: `"${memory.title}" could be applied to improve ${project_context || "current project"}`,
        confidence: memory.metadata.reusability,
        evidence: [
          `Reusability score: ${memory.metadata.reusability}`,
          `Applied to ${memory.relationships.applied_to_projects.length} projects`,
          `Complexity: ${memory.metadata.complexity}/10`,
        ],
        suggested_actions: this.generateSuggestedActions(
          memory,
          project_context,
        ),
      });
    }

    return insights;
  }

  async getMostValuableMemories(limit = 20): Promise<GlobalMemory[]> {
    await this.initialize();

    const searchResult = await this.client.search(this.collectionName, {
      vector: new Array(384).fill(0), // Dummy vector for sorting by payload
      limit: 100, // Get larger set to sort by value
      with_payload: true,
    });

    const memories = searchResult.map((point) =>
      this.mapPointToGlobalMemory(point),
    );

    // Sort by value (combination of reusability, usage, and salience)
    return memories
      .sort(
        (a, b) => this.calculateMemoryValue(b) - this.calculateMemoryValue(a),
      )
      .slice(0, limit);
  }

  async archiveGlobalMemory(id: string): Promise<void> {
    await this.initialize();

    await this.client.delete(this.collectionName, {
      wait: true,
      points: [id],
    });
  }

  async getGlobalMemoryStats(): Promise<{
    total_memories: number;
    memories_by_type: Record<GlobalMemoryType, number>;
    avg_salience: number;
    avg_reusability: number;
    most_accessed: GlobalMemory[];
    recent_additions: GlobalMemory[];
  }> {
    await this.initialize();

    // Get all global memories
    const searchResult = await this.client.search(this.collectionName, {
      vector: new Array(384).fill(0),
      limit: 1000,
      with_payload: true,
    });

    const memories = searchResult.map((point) =>
      this.mapPointToGlobalMemory(point),
    );

    const stats = {
      total_memories: memories.length,
      memories_by_type: this.calculateMemoriesByType(memories),
      avg_salience:
        memories.reduce((sum, m) => sum + m.metadata.salience, 0) /
        memories.length,
      avg_reusability:
        memories.reduce((sum, m) => sum + m.metadata.reusability, 0) /
        memories.length,
      most_accessed: memories
        .sort((a, b) => b.metadata.usage_count - a.metadata.usage_count)
        .slice(0, 5),
      recent_additions: memories
        .sort(
          (a, b) => b.metadata.created.getTime() - a.metadata.created.getTime(),
        )
        .slice(0, 5),
    };

    return stats;
  }

  private mapPointToGlobalMemory(point: any): GlobalMemory {
    const payload = point.payload;
    const vector = Array.isArray(point.vector)
      ? new Float32Array(point.vector)
      : undefined;

    return {
      id: point.id,
      type: payload.type as GlobalMemoryType,
      title: payload.title,
      content: payload.content,
      metadata: {
        tags: payload.tags || [],
        created: new Date(payload.created),
        updated: new Date(payload.updated),
        salience: payload.salience,
        complexity: payload.complexity,
        reusability: payload.reusability,
        source_projects: payload.source_projects || [],
        usage_count: payload.usage_count || 0,
        last_accessed: new Date(payload.last_accessed),
      },
      relationships: {
        related_memories: payload.related_memories || [],
        derived_from: payload.derived_from || [],
        applied_to_projects: payload.applied_to_projects || [],
      },
      embedding: vector,
    };
  }

  private calculateMemoryValue(memory: GlobalMemory): number {
    return (
      memory.metadata.reusability * 0.4 +
      memory.metadata.salience * 0.3 +
      Math.min(1, memory.metadata.usage_count / 10) * 0.3
    );
  }

  private calculateMemoriesByType(
    memories: GlobalMemory[],
  ): Record<GlobalMemoryType, number> {
    const counts = {} as Record<GlobalMemoryType, number>;

    // Initialize all types to 0
    Object.values(GlobalMemoryType).forEach((type) => {
      counts[type] = 0;
    });

    // Count actual memories
    memories.forEach((memory) => {
      counts[memory.type] = (counts[memory.type] || 0) + 1;
    });

    return counts;
  }

  private generateSuggestedActions(
    memory: GlobalMemory,
    project_context?: string,
  ): string[] {
    const actions: string[] = [];

    switch (memory.type) {
      case GlobalMemoryType.LESSON:
        actions.push("Review lesson before starting similar tasks");
        actions.push("Apply lesson to current implementation approach");
        break;
      case GlobalMemoryType.PATTERN:
        actions.push("Consider implementing this pattern");
        actions.push("Evaluate pattern fit for current architecture");
        break;
      case GlobalMemoryType.BEST_PRACTICE:
        actions.push("Adopt this best practice");
        actions.push("Review current code against this practice");
        break;
      case GlobalMemoryType.ANTIPATTERN:
        actions.push("Avoid this antipattern");
        actions.push("Review current implementation for this issue");
        break;
      default:
        actions.push("Review and consider application");
    }

    if (memory.metadata.reusability > 0.8) {
      actions.push("High reusability - strongly consider adoption");
    }

    return actions;
  }
}

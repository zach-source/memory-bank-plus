import { QdrantClient } from "@qdrant/js-client-rest";
import { SummaryRepository } from "../../data/protocols/summary-repository.js";
import { Summary, SummaryHierarchy, SummaryLevel } from "../../domain/entities/index.js";

interface QdrantConfig {
  url?: string;
  host?: string;
  port?: number;
  apiKey?: string;
}

interface SummaryPoint {
  id: string;
  vector: number[];
  payload: {
    projectName: string;
    content: string;
    level: SummaryLevel;
    type: string;
    sourceFiles: string[];
    tokens: number;
    compressionRatio: number;
    created: string;
    updated: string;
    parentSummaryId?: string;
    childSummaryIds: string[];
  };
}

export class QdrantSummaryRepository implements SummaryRepository {
  private client: QdrantClient;
  private collectionName = "memory_bank_summaries";
  private initialized = false;

  constructor(private readonly config: QdrantConfig = {}) {
    const clientConfig = {
      url: config.url || `http://${config.host || "localhost"}:${config.port || 6333}`,
      ...(config.apiKey && { apiKey: config.apiKey }),
    };

    this.client = new QdrantClient(clientConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections?.some(
        (collection) => collection.name === this.collectionName
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

        // Create indices for efficient filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "projectName",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "level",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "updated",
          field_schema: "datetime",
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize summary collection:", error);
      throw new Error(`Failed to initialize summary database: ${error}`);
    }
  }

  async upsertSummary(summary: Summary): Promise<void> {
    await this.initialize();

    const point: SummaryPoint = {
      id: summary.id,
      vector: summary.embedding ? Array.from(summary.embedding) : new Array(384).fill(0),
      payload: {
        projectName: summary.projectName,
        content: summary.content,
        level: summary.metadata.level,
        type: summary.metadata.type,
        sourceFiles: summary.metadata.sourceFiles,
        tokens: summary.metadata.tokens,
        compressionRatio: summary.metadata.compressionRatio,
        created: summary.metadata.created.toISOString(),
        updated: summary.metadata.updated.toISOString(),
        parentSummaryId: summary.metadata.parentSummaryId,
        childSummaryIds: summary.metadata.childSummaryIds,
      },
    };

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [point],
    });
  }

  async getSummary(id: string): Promise<Summary | null> {
    await this.initialize();

    const points = await this.client.retrieve(this.collectionName, {
      ids: [id],
      with_payload: true,
      with_vector: true,
    });

    if (points.length === 0) return null;

    return this.mapPointToSummary(points[0]);
  }

  async getSummariesByLevel(
    projectName: string,
    level: SummaryLevel
  ): Promise<Summary[]> {
    await this.initialize();

    const searchResult = await this.client.scroll(this.collectionName, {
      filter: {
        must: [
          {
            key: "projectName",
            match: { value: projectName },
          },
          {
            key: "level",
            match: { value: level },
          },
        ],
      },
      with_payload: true,
      with_vector: true,
      limit: 100,
    });

    return searchResult.points.map(point => this.mapPointToSummary(point));
  }

  async getProjectHierarchy(projectName: string): Promise<SummaryHierarchy | null> {
    await this.initialize();

    // Get all summaries for the project
    const allSummaries = await this.getAllProjectSummaries(projectName);
    
    if (allSummaries.length === 0) return null;

    // Organize by level
    const projectSummaries = allSummaries.filter(s => s.metadata.level === SummaryLevel.PROJECT);
    const sectionSummaries = allSummaries.filter(s => s.metadata.level === SummaryLevel.SECTION);
    const nodeSummaries = allSummaries.filter(s => s.metadata.level === SummaryLevel.NODE);

    if (projectSummaries.length === 0) return null;

    const rootSummary = projectSummaries[0]; // Take the first project summary
    const totalTokens = allSummaries.reduce((sum, s) => sum + s.metadata.tokens, 0);
    const avgCompressionRatio = 
      allSummaries.reduce((sum, s) => sum + s.metadata.compressionRatio, 0) / allSummaries.length;

    const lastUpdated = allSummaries.reduce((latest, s) => 
      s.metadata.updated > latest ? s.metadata.updated : latest, 
      new Date(0)
    );

    return {
      projectName,
      rootSummary,
      sections: sectionSummaries,
      nodes: nodeSummaries,
      totalTokens,
      compressionRatio: avgCompressionRatio,
      lastUpdated,
    };
  }

  async deleteSummary(id: string): Promise<void> {
    await this.initialize();

    await this.client.delete(this.collectionName, {
      wait: true,
      points: [id],
    });
  }

  async findStalesSummaries(
    projectName: string,
    changedFiles: string[]
  ): Promise<Summary[]> {
    await this.initialize();

    const allSummaries = await this.getAllProjectSummaries(projectName);
    
    // Find summaries that reference any of the changed files
    return allSummaries.filter(summary =>
      summary.metadata.sourceFiles.some(file => changedFiles.includes(file))
    );
  }

  async searchSummaries(
    projectName: string,
    query: string,
    maxResults = 10
  ): Promise<Summary[]> {
    await this.initialize();

    // For now, use simple text matching
    // TODO: Implement proper semantic search with embeddings
    const allSummaries = await this.getAllProjectSummaries(projectName);
    
    const queryLower = query.toLowerCase();
    const matchingSummaries = allSummaries
      .filter(summary => 
        summary.content.toLowerCase().includes(queryLower) ||
        summary.metadata.sourceFiles.some(file => 
          file.toLowerCase().includes(queryLower)
        )
      )
      .sort((a, b) => {
        // Simple relevance scoring
        const aScore = this.calculateSimpleRelevance(a.content, query);
        const bScore = this.calculateSimpleRelevance(b.content, query);
        return bScore - aScore;
      });

    return matchingSummaries.slice(0, maxResults);
  }

  async getProjectSummaryStats(projectName: string): Promise<{
    totalSummaries: number;
    totalTokens: number;
    averageCompressionRatio: number;
    lastUpdated: Date;
  }> {
    await this.initialize();

    const summaries = await this.getAllProjectSummaries(projectName);
    
    if (summaries.length === 0) {
      return {
        totalSummaries: 0,
        totalTokens: 0,
        averageCompressionRatio: 0,
        lastUpdated: new Date(),
      };
    }

    const totalTokens = summaries.reduce((sum, s) => sum + s.metadata.tokens, 0);
    const averageCompressionRatio = 
      summaries.reduce((sum, s) => sum + s.metadata.compressionRatio, 0) / summaries.length;
    
    const lastUpdated = summaries.reduce((latest, s) => 
      s.metadata.updated > latest ? s.metadata.updated : latest, 
      new Date(0)
    );

    return {
      totalSummaries: summaries.length,
      totalTokens,
      averageCompressionRatio,
      lastUpdated,
    };
  }

  private async getAllProjectSummaries(projectName: string): Promise<Summary[]> {
    const searchResult = await this.client.scroll(this.collectionName, {
      filter: {
        must: [
          {
            key: "projectName",
            match: { value: projectName },
          },
        ],
      },
      with_payload: true,
      with_vector: true,
      limit: 1000, // Reasonable limit for project summaries
    });

    return searchResult.points.map(point => this.mapPointToSummary(point));
  }

  private mapPointToSummary(point: any): Summary {
    const payload = point.payload;
    const vector = Array.isArray(point.vector) ? new Float32Array(point.vector) : undefined;

    return {
      id: point.id,
      projectName: payload.projectName,
      content: payload.content,
      metadata: {
        level: payload.level,
        type: payload.type,
        sourceFiles: payload.sourceFiles,
        tokens: payload.tokens,
        compressionRatio: payload.compressionRatio,
        created: new Date(payload.created),
        updated: new Date(payload.updated),
        parentSummaryId: payload.parentSummaryId,
        childSummaryIds: payload.childSummaryIds,
      },
      embedding: vector,
    };
  }

  private calculateSimpleRelevance(content: string, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const matches = queryWords.filter(word =>
      contentWords.some(contentWord => contentWord.includes(word))
    );
    
    return matches.length / queryWords.length;
  }
}
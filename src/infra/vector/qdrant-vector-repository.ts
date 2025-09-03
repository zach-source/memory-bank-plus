import { QdrantClient } from "@qdrant/js-client-rest";
import { VectorRepository } from "../../data/protocols/vector-repository.js";
import { EnhancedFile, SearchQuery, SearchResult } from "../../domain/entities/index.js";

interface QdrantConfig {
  url?: string;
  host?: string;
  port?: number;
  apiKey?: string;
}

interface FilePoint {
  id: string;
  vector: number[];
  payload: {
    projectName: string;
    fileName: string;
    content: string;
    contentHash: string;
    tags: string[];
    created: string;
    updated: string;
    lastAccessed?: string;
    task?: string;
    salience?: number;
    frequency?: number;
  };
}

export class QdrantVectorRepository implements VectorRepository {
  private client: QdrantClient;
  private collectionName = "memory_bank_files";
  private initialized = false;

  constructor(private readonly config: QdrantConfig = {}) {
    // Default to local Qdrant instance
    const clientConfig = {
      url: config.url || `http://${config.host || "localhost"}:${config.port || 6333}`,
      ...(config.apiKey && { apiKey: config.apiKey }),
    };

    this.client = new QdrantClient(clientConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections?.some(
        (collection) => collection.name === this.collectionName
      );

      if (!collectionExists) {
        // Create collection with 384-dimensional vectors (common for sentence transformers)
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 384,
            distance: "Cosine", // Cosine similarity for semantic search
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        // Create payload index for fast filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "projectName",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "tags",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "updated",
          field_schema: "datetime",
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize Qdrant collection:", error);
      throw new Error(`Failed to initialize vector database: ${error}`);
    }
  }

  private generatePointId(projectName: string, fileName: string): string {
    return `${projectName}:${fileName}`;
  }

  async upsertFile(file: EnhancedFile): Promise<void> {
    await this.initialize();

    if (!file.embedding) {
      console.warn("No embedding provided for file, generating mock embedding");
      file.embedding = await this.getEmbedding(file.content);
    }

    const pointId = this.generatePointId(file.projectName, file.name);
    
    const point: FilePoint = {
      id: pointId,
      vector: Array.from(file.embedding),
      payload: {
        projectName: file.projectName,
        fileName: file.name,
        content: file.content,
        contentHash: file.contentHash || "",
        tags: file.metadata.tags,
        created: file.metadata.created.toISOString(),
        updated: file.metadata.updated.toISOString(),
        lastAccessed: file.metadata.lastAccessed?.toISOString(),
        task: file.metadata.task,
        salience: file.metadata.salience,
        frequency: file.metadata.frequency,
      },
    };

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [point],
    });
  }

  async deleteFile(projectName: string, fileName: string): Promise<void> {
    await this.initialize();

    const pointId = this.generatePointId(projectName, fileName);
    
    await this.client.delete(this.collectionName, {
      wait: true,
      points: [pointId],
    });
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    await this.initialize();

    // Generate query embedding
    const queryEmbedding = await this.getEmbedding(query.query);

    // Build filter conditions
    const filter: any = {
      must: [],
    };

    if (query.projectName) {
      filter.must.push({
        key: "projectName",
        match: {
          value: query.projectName,
        },
      });
    }

    if (query.tags && query.tags.length > 0) {
      filter.must.push({
        key: "tags",
        match: {
          any: query.tags,
        },
      });
    }

    // Perform semantic search
    const searchResult = await this.client.search(this.collectionName, {
      vector: Array.from(queryEmbedding),
      limit: query.limit || 20,
      filter: filter.must.length > 0 ? filter : undefined,
      with_payload: true,
    });

    // Process and rank results
    return searchResult.map((point) => this.mapQdrantPointToSearchResult(point, query));
  }

  private mapQdrantPointToSearchResult(point: any, query: SearchQuery): SearchResult {
    const payload = point.payload;
    const now = new Date();
    
    const updatedAt = new Date(payload.updated);
    const createdAt = new Date(payload.created);
    const lastAccessedAt = payload.lastAccessed ? new Date(payload.lastAccessed) : undefined;

    // Calculate time-based scores
    const daysSinceUpdate = Math.max(1, (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = 1 / Math.log(daysSinceUpdate + 1);
    
    const frequencyScore = Math.log((payload.frequency || 0) + 1) / 10;
    const salienceScore = payload.salience || 0.5;
    
    const timeDecayDays = query.timeDecayDays || 30;
    const timeDecayScore = Math.exp(-daysSinceUpdate / timeDecayDays);
    
    // Semantic score from Qdrant (already normalized 0-1)
    const semanticScore = point.score;

    // Combine scores with weights
    const combinedScore = 
      (query.semanticWeight || 0.4) * semanticScore +
      (query.recencyWeight || 0.2) * recencyScore +
      (query.frequencyWeight || 0.2) * frequencyScore +
      (query.salienceWeight || 0.2) * salienceScore * timeDecayScore;

    return {
      file: {
        name: payload.fileName,
        projectName: payload.projectName,
        content: payload.content,
        metadata: {
          tags: payload.tags || [],
          updated: updatedAt,
          created: createdAt,
          lastAccessed: lastAccessedAt,
          task: payload.task,
          salience: payload.salience,
          frequency: payload.frequency,
        },
      },
      scores: {
        semantic: semanticScore,
        recency: recencyScore,
        frequency: frequencyScore,
        salience: salienceScore,
        timeDecay: timeDecayScore,
        combined: combinedScore,
      },
      snippet: this.extractSnippet(payload.content, query.query),
    };
  }

  private extractSnippet(content: string, query: string): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const index = contentLower.indexOf(queryLower);
    
    if (index === -1) {
      return content.substring(0, 200) + "...";
    }
    
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + queryLower.length + 100);
    
    return (start > 0 ? "..." : "") + 
           content.substring(start, end) + 
           (end < content.length ? "..." : "");
  }

  async getEmbedding(text: string): Promise<Float32Array> {
    // TODO: Integrate with actual embedding service (OpenAI, Hugging Face, etc.)
    console.warn("Mock embedding generation - implement with actual embedding model");
    
    // For now, generate a simple hash-based embedding for consistency
    const embedding = new Float32Array(384);
    const textBytes = new TextEncoder().encode(text);
    
    for (let i = 0; i < embedding.length; i++) {
      // Simple hash function for consistent "embeddings"
      let hash = 0;
      for (let j = 0; j < textBytes.length; j++) {
        hash = ((hash << 5) - hash + textBytes[j]) & 0xffffffff;
      }
      embedding[i] = (hash % 1000) / 1000 - 0.5; // Normalize to [-0.5, 0.5]
      hash = hash * 31 + i; // Add position information
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
    
    return embedding;
  }

  async updateFileAccess(projectName: string, fileName: string): Promise<void> {
    await this.initialize();

    const pointId = this.generatePointId(projectName, fileName);
    
    // Get current point
    const points = await this.client.retrieve(this.collectionName, {
      ids: [pointId],
      with_payload: true,
    });

    if (points.length === 0) {
      console.warn(`File not found for access update: ${pointId}`);
      return;
    }

    const point = points[0];
    const payload = point.payload as any;
    
    // Update access information
    payload.lastAccessed = new Date().toISOString();
    payload.frequency = (payload.frequency || 0) + 1;

    // Update the point with new payload
    const vectorData = Array.isArray(point.vector) ? point.vector : [];
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [{
        id: pointId,
        vector: vectorData,
        payload,
      }],
    });
  }

  async getProjectStats(projectName: string): Promise<{
    totalFiles: number;
    totalEmbeddings: number;
    lastUpdated: Date;
  }> {
    await this.initialize();

    // Count points for the project
    const countResult = await this.client.count(this.collectionName, {
      filter: {
        must: [{
          key: "projectName",
          match: { value: projectName },
        }],
      },
    });

    // Get the most recent update
    const searchResult = await this.client.search(this.collectionName, {
      vector: new Array(384).fill(0), // Dummy vector
      limit: 1,
      filter: {
        must: [{
          key: "projectName",
          match: { value: projectName },
        }],
      },
      with_payload: true,
    });

    const lastUpdated = searchResult.length > 0 && searchResult[0].payload?.updated
      ? new Date(searchResult[0].payload.updated as string)
      : new Date();

    return {
      totalFiles: countResult.count,
      totalEmbeddings: countResult.count, // Same as files in this implementation
      lastUpdated,
    };
  }
}
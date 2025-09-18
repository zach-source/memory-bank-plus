import { GlobalMemoryUseCase } from "../../../domain/usecases/global-memory.js";
import {
  GlobalMemory,
  GlobalMemoryType,
  GlobalMemoryQuery,
  GlobalMemoryInsight,
} from "../../../domain/entities/global-memory.js";
import {
  GlobalMemoryRepository,
  FileRepository,
  VectorRepository,
} from "../../protocols/index.js";

export class GlobalMemoryImpl implements GlobalMemoryUseCase {
  private readonly GLOBAL_PROJECT_NAME = "__GLOBAL__";

  constructor(
    private readonly globalMemoryRepository: GlobalMemoryRepository,
    private readonly fileRepository: FileRepository,
    private readonly vectorRepository: VectorRepository,
  ) {}

  async storeGlobalLesson(
    title: string,
    content: string,
    type: GlobalMemoryType,
    metadata: {
      tags: string[];
      salience: number;
      complexity: number;
      source_projects: string[];
    },
  ): Promise<GlobalMemory> {
    const memory: GlobalMemory = {
      id: this.generateGlobalMemoryId(type, title),
      type,
      title,
      content,
      metadata: {
        ...metadata,
        created: new Date(),
        updated: new Date(),
        reusability: this.calculateReusability(
          metadata.complexity,
          metadata.salience,
        ),
        usage_count: 0,
        last_accessed: new Date(),
      },
      relationships: {
        related_memories: [],
        derived_from: [],
        applied_to_projects: [],
      },
    };

    // Generate embedding for global memory
    memory.embedding = await this.vectorRepository.getEmbedding(
      `${title} ${content}`,
    );

    await this.globalMemoryRepository.storeGlobalMemory(memory);

    return memory;
  }

  async searchGlobalMemories(
    query: GlobalMemoryQuery,
  ): Promise<GlobalMemory[]> {
    return this.globalMemoryRepository.searchGlobalMemories(query);
  }

  async getContextualMemories(
    current_project: string,
    context_query: string,
    limit = 10,
  ): Promise<GlobalMemory[]> {
    // Search for global memories that are relevant to the current project context
    const query: GlobalMemoryQuery = {
      query: context_query,
      limit,
      min_salience: 0.6, // Only high-value global memories
    };

    const memories =
      await this.globalMemoryRepository.searchGlobalMemories(query);

    // Filter and prioritize based on project relevance
    return memories
      .filter((memory) => this.isRelevantToProject(memory, current_project))
      .sort(
        (a, b) =>
          this.calculateProjectRelevance(b, current_project) -
          this.calculateProjectRelevance(a, current_project),
      )
      .slice(0, limit);
  }

  async promoteToGlobal(
    project_name: string,
    file_name: string,
    global_type: GlobalMemoryType,
    additional_metadata?: {
      reusability_score?: number;
      applicability?: string[];
    },
  ): Promise<GlobalMemory> {
    // Load the project-specific memory
    const content = await this.fileRepository.loadFile(project_name, file_name);
    if (!content) {
      throw new Error(`File not found: ${project_name}/${file_name}`);
    }

    // Extract metadata from YAML front-matter if present
    const { title, tags, salience, complexity } =
      this.extractMetadataFromContent(content);

    // Create global memory
    const memory: GlobalMemory = {
      id: this.generateGlobalMemoryId(global_type, title),
      type: global_type,
      title,
      content,
      metadata: {
        tags,
        created: new Date(),
        updated: new Date(),
        salience,
        complexity,
        reusability:
          additional_metadata?.reusability_score ||
          this.calculateReusability(complexity, salience),
        source_projects: [project_name],
        usage_count: 1,
        last_accessed: new Date(),
      },
      relationships: {
        related_memories: [],
        derived_from: [`${project_name}:${file_name}`],
        applied_to_projects: [project_name],
      },
    };

    memory.embedding = await this.vectorRepository.getEmbedding(
      `${title} ${content}`,
    );

    await this.globalMemoryRepository.storeGlobalMemory(memory);

    return memory;
  }

  async getProjectRelevantInsights(
    project_name: string,
  ): Promise<GlobalMemoryInsight[]> {
    return this.globalMemoryRepository.getGlobalMemoryInsights(project_name);
  }

  async recordGlobalMemoryApplication(
    memory_id: string,
    project_context: string,
    success: boolean,
    feedback?: string,
  ): Promise<void> {
    await this.globalMemoryRepository.updateGlobalMemoryAccess(
      memory_id,
      project_context,
    );

    // If successful application, increase reusability score
    if (success) {
      const memory =
        await this.globalMemoryRepository.getGlobalMemory(memory_id);
      if (
        memory &&
        !memory.relationships.applied_to_projects.includes(project_context)
      ) {
        memory.relationships.applied_to_projects.push(project_context);
        memory.metadata.reusability = Math.min(
          1.0,
          memory.metadata.reusability + 0.1,
        );
        await this.globalMemoryRepository.storeGlobalMemory(memory);
      }
    }
  }

  async getMostValuableGlobalMemories(limit = 20): Promise<GlobalMemory[]> {
    return this.globalMemoryRepository.getMostValuableMemories(limit);
  }

  private calculateReusability(complexity: number, salience: number): number {
    // Higher complexity and salience generally mean higher reusability
    const base_reusability = salience * 0.6 + (complexity / 10) * 0.4;
    return Math.min(1.0, Math.max(0.1, base_reusability));
  }

  private isRelevantToProject(memory: GlobalMemory, project: string): boolean {
    // Check if global memory is relevant to the current project
    return (
      memory.relationships.applied_to_projects.includes(project) ||
      memory.metadata.source_projects.includes(project) ||
      memory.metadata.reusability > 0.8 || // High reusability means broadly applicable
      memory.type === GlobalMemoryType.PRINCIPLE || // Principles are always relevant
      memory.type === GlobalMemoryType.BEST_PRACTICE // Best practices are always relevant
    );
  }

  private calculateProjectRelevance(
    memory: GlobalMemory,
    project: string,
  ): number {
    let relevance = memory.metadata.reusability;

    // Boost if previously applied to this project
    if (memory.relationships.applied_to_projects.includes(project)) {
      relevance += 0.3;
    }

    // Boost if derived from this project
    if (memory.metadata.source_projects.includes(project)) {
      relevance += 0.2;
    }

    // Boost for certain types
    if (
      memory.type === GlobalMemoryType.PRINCIPLE ||
      memory.type === GlobalMemoryType.BEST_PRACTICE
    ) {
      relevance += 0.1;
    }

    return Math.min(1.0, relevance);
  }

  private extractMetadataFromContent(content: string): {
    title: string;
    tags: string[];
    salience: number;
    complexity: number;
  } {
    // Simple extraction from YAML front-matter or content
    const lines = content.split("\n");
    let title = "Untitled Global Memory";
    let tags: string[] = [];
    let salience = 0.7; // Default
    let complexity = 5; // Default

    // Look for title in markdown headers
    const titleLine = lines.find((line) => line.startsWith("# "));
    if (titleLine) {
      title = titleLine.replace("# ", "").trim();
    }

    // Look for YAML front-matter
    if (content.startsWith("---")) {
      const frontMatterEnd = content.indexOf("---", 3);
      if (frontMatterEnd > -1) {
        const frontMatter = content.substring(3, frontMatterEnd);

        // Simple parsing (in production, use proper YAML parser)
        const tagsMatch = frontMatter.match(/tags:\s*\[([^\]]+)\]/);
        if (tagsMatch) {
          tags = tagsMatch[1]
            .split(",")
            .map((tag) => tag.trim().replace(/['"]/g, ""));
        }

        const salienceMatch = frontMatter.match(/salience:\s*([0-9.]+)/);
        if (salienceMatch) {
          salience = parseFloat(salienceMatch[1]);
        }

        const complexityMatch = frontMatter.match(/complexity:\s*([0-9]+)/);
        if (complexityMatch) {
          complexity = parseInt(complexityMatch[1]);
        }
      }
    }

    return { title, tags, salience, complexity };
  }

  private generateGlobalMemoryId(
    type: GlobalMemoryType,
    title: string,
  ): string {
    const sanitized = title.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return `global-${type}-${sanitized}-${Date.now()}`;
  }
}

import {
  CompileMemoryHierarchyUseCase,
  CompilationOptions,
} from "../../../domain/usecases/compile-memory-hierarchy.js";
import {
  Summary,
  SummaryHierarchy,
  SummaryLevel,
  SummaryType,
} from "../../../domain/entities/index.js";
import {
  FileRepository,
  VectorRepository,
  SummaryRepository,
  LLMService,
} from "../../protocols/index.js";

export class CompileMemoryHierarchy implements CompileMemoryHierarchyUseCase {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly vectorRepository: VectorRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly llmService: LLMService
  ) {}

  async compileProject(
    projectName: string,
    options: CompilationOptions = {}
  ): Promise<SummaryHierarchy> {
    const {
      forceRecompile = false,
      maxTokensPerSummary = 1000,
      compressionRatio = 0.3,
      focusAreas = [],
    } = options;

    // Check if we need to recompile or can use existing hierarchy
    if (!forceRecompile) {
      const existingHierarchy = await this.summaryRepository.getProjectHierarchy(projectName);
      if (existingHierarchy && this.isHierarchyFresh(existingHierarchy)) {
        return existingHierarchy;
      }
    }

    // Get all files in the project
    const files = await this.fileRepository.listFiles(projectName);
    
    // Step 1: Create node-level summaries (individual files)
    const nodeSummaries = await this.createNodeSummaries(
      projectName,
      files,
      maxTokensPerSummary,
      focusAreas
    );

    // Step 2: Create section-level summaries (groups of related files)
    const sectionSummaries = await this.createSectionSummaries(
      projectName,
      nodeSummaries,
      maxTokensPerSummary * 2,
      focusAreas
    );

    // Step 3: Create project-level summary (top-level overview)
    const projectSummary = await this.createProjectSummary(
      projectName,
      sectionSummaries,
      maxTokensPerSummary * 3,
      focusAreas
    );

    // Build the hierarchy
    const hierarchy: SummaryHierarchy = {
      projectName,
      rootSummary: projectSummary,
      sections: sectionSummaries,
      nodes: nodeSummaries,
      totalTokens: this.calculateTotalTokens(nodeSummaries, sectionSummaries, [projectSummary]),
      compressionRatio,
      lastUpdated: new Date(),
    };

    // Store the hierarchy
    await this.storeHierarchy(hierarchy);

    return hierarchy;
  }

  async updateHierarchy(
    projectName: string,
    changedFiles: string[]
  ): Promise<SummaryHierarchy> {
    // Find stale summaries that need updating
    const staleSummaries = await this.summaryRepository.findStalesSummaries(
      projectName,
      changedFiles
    );

    if (staleSummaries.length === 0) {
      // No updates needed, return existing hierarchy
      const existing = await this.summaryRepository.getProjectHierarchy(projectName);
      if (existing) return existing;
    }

    // For now, recompile the entire hierarchy
    // TODO: Implement incremental updates for better performance
    return this.compileProject(projectName, { forceRecompile: true });
  }

  async getOptimalSummaryLevel(
    projectName: string,
    maxTokens: number
  ): Promise<Summary[]> {
    const hierarchy = await this.summaryRepository.getProjectHierarchy(projectName);
    if (!hierarchy) {
      throw new Error(`No hierarchy found for project: ${projectName}`);
    }

    // Start with most detailed level that fits in budget
    if (this.calculateTotalTokens(hierarchy.nodes) <= maxTokens) {
      return hierarchy.nodes;
    }

    if (this.calculateTotalTokens(hierarchy.sections) <= maxTokens) {
      return hierarchy.sections;
    }

    // Return just the project summary
    return [hierarchy.rootSummary];
  }

  private async createNodeSummaries(
    projectName: string,
    files: string[],
    maxTokens: number,
    focusAreas: string[]
  ): Promise<Summary[]> {
    const summaries: Summary[] = [];

    for (const fileName of files) {
      const content = await this.fileRepository.loadFile(projectName, fileName);
      if (!content) continue;

      const tokens = await this.llmService.countTokens(content);
      
      let summaryContent: string;
      if (tokens <= maxTokens) {
        // Content is already small enough
        summaryContent = content;
      } else {
        // Summarize the content
        summaryContent = await this.llmService.summarize(content, {
          level: SummaryLevel.NODE,
          type: SummaryType.ABSTRACTIVE,
          maxTokens,
          style: 'structured',
          focusAreas,
        });
      }

      const summary: Summary = {
        id: this.generateSummaryId(projectName, fileName, SummaryLevel.NODE),
        projectName,
        content: summaryContent,
        metadata: {
          level: SummaryLevel.NODE,
          type: tokens <= maxTokens ? SummaryType.EXTRACTIVE : SummaryType.ABSTRACTIVE,
          sourceFiles: [fileName],
          tokens: await this.llmService.countTokens(summaryContent),
          compressionRatio: tokens > 0 ? (await this.llmService.countTokens(summaryContent)) / tokens : 1,
          created: new Date(),
          updated: new Date(),
          childSummaryIds: [],
        },
      };

      // Generate embedding for the summary
      if (this.vectorRepository.getEmbedding) {
        summary.embedding = await this.vectorRepository.getEmbedding(summaryContent);
      }

      summaries.push(summary);
    }

    return summaries;
  }

  private async createSectionSummaries(
    projectName: string,
    nodeSummaries: Summary[],
    maxTokens: number,
    focusAreas: string[]
  ): Promise<Summary[]> {
    // Group related summaries using simple clustering
    // TODO: Implement more sophisticated clustering based on embeddings
    const groups = this.clusterSummaries(nodeSummaries, 3); // Max 3 sections per project for now
    
    const sectionSummaries: Summary[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const combinedContent = group.map(s => s.content).join('\n\n');
      
      const sectionContent = await this.llmService.summarize(combinedContent, {
        level: SummaryLevel.SECTION,
        type: SummaryType.HIERARCHICAL,
        maxTokens,
        style: 'structured',
        focusAreas,
      });

      const summary: Summary = {
        id: this.generateSummaryId(projectName, `section-${i}`, SummaryLevel.SECTION),
        projectName,
        content: sectionContent,
        metadata: {
          level: SummaryLevel.SECTION,
          type: SummaryType.HIERARCHICAL,
          sourceFiles: group.flatMap(s => s.metadata.sourceFiles),
          tokens: await this.llmService.countTokens(sectionContent),
          compressionRatio: 0.5, // Rough estimate
          created: new Date(),
          updated: new Date(),
          childSummaryIds: group.map(s => s.id),
        },
      };

      sectionSummaries.push(summary);
    }

    return sectionSummaries;
  }

  private async createProjectSummary(
    projectName: string,
    sectionSummaries: Summary[],
    maxTokens: number,
    focusAreas: string[]
  ): Promise<Summary> {
    const combinedContent = sectionSummaries.map(s => s.content).join('\n\n');
    
    const projectContent = await this.llmService.summarize(combinedContent, {
      level: SummaryLevel.PROJECT,
      type: SummaryType.HIERARCHICAL,
      maxTokens,
      style: 'structured',
      focusAreas,
    });

    return {
      id: this.generateSummaryId(projectName, 'overview', SummaryLevel.PROJECT),
      projectName,
      content: projectContent,
      metadata: {
        level: SummaryLevel.PROJECT,
        type: SummaryType.HIERARCHICAL,
        sourceFiles: sectionSummaries.flatMap(s => s.metadata.sourceFiles),
        tokens: await this.llmService.countTokens(projectContent),
        compressionRatio: 0.3, // Rough estimate
        created: new Date(),
        updated: new Date(),
        childSummaryIds: sectionSummaries.map(s => s.id),
      },
    };
  }

  private clusterSummaries(summaries: Summary[], maxClusters: number): Summary[][] {
    // Simple clustering: divide summaries into roughly equal groups
    // TODO: Implement semantic clustering using embeddings
    const clusters: Summary[][] = [];
    const clusterSize = Math.ceil(summaries.length / maxClusters);

    for (let i = 0; i < summaries.length; i += clusterSize) {
      clusters.push(summaries.slice(i, i + clusterSize));
    }

    return clusters.filter(cluster => cluster.length > 0);
  }

  private async storeHierarchy(hierarchy: SummaryHierarchy): Promise<void> {
    // Store all summaries
    await this.summaryRepository.upsertSummary(hierarchy.rootSummary);
    
    for (const section of hierarchy.sections) {
      await this.summaryRepository.upsertSummary(section);
    }
    
    for (const node of hierarchy.nodes) {
      await this.summaryRepository.upsertSummary(node);
    }
  }

  private isHierarchyFresh(hierarchy: SummaryHierarchy): boolean {
    // Consider hierarchy fresh if updated within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return hierarchy.lastUpdated > oneHourAgo;
  }

  private calculateTotalTokens(
    ...summaryArrays: Summary[][]
  ): number {
    return summaryArrays
      .flat()
      .reduce((total, summary) => total + summary.metadata.tokens, 0);
  }

  private generateSummaryId(
    projectName: string,
    identifier: string,
    level: SummaryLevel
  ): string {
    return `${projectName}:${level}:${identifier}:${Date.now()}`;
  }
}
import {
  ReflexiveLearningUseCase,
  TaskCompletionContext,
  PatternInsight,
} from "../../../domain/usecases/reflexive-learning.js";
import {
  EpisodicMemory,
  SkillDocument,
  CaseExample,
  EpisodicType,
  SkillCategory,
} from "../../../domain/entities/index.js";
import {
  EpisodicMemoryRepository,
  LLMService,
  AdaptivePolicyService,
} from "../../protocols/index.js";

export class ReflexiveLearning implements ReflexiveLearningUseCase {
  constructor(
    private readonly episodicRepository: EpisodicMemoryRepository,
    private readonly llmService: LLMService,
    private readonly policyService: AdaptivePolicyService
  ) {}

  async captureTaskCompletion(context: TaskCompletionContext): Promise<EpisodicMemory> {
    const {
      query,
      projectName,
      tools_used,
      files_modified,
      duration_ms,
      success,
      error_messages = [],
      solution_steps,
      outcomes,
      user_feedback,
    } = context;

    // Calculate salience based on context
    const salience = await this.policyService.calculateSalience(query, {
      success,
      complexity: this.estimateComplexity(tools_used, files_modified, solution_steps),
      tools_used,
      duration: duration_ms,
    });

    // Generate lessons learned
    const lessons_learned = await this.extractLessonsFromContext(context);

    // Identify patterns used
    const patterns_identified = await this.identifyAppliedPatterns(solution_steps, tools_used);

    // Create episodic memory
    const episode: EpisodicMemory = {
      id: this.generateEpisodeId(projectName, Date.now()),
      projectName,
      type: success ? EpisodicType.TASK_COMPLETION : EpisodicType.ERROR_RESOLUTION,
      title: this.generateTitle(query, success),
      description: this.generateDescription(context),
      context: {
        originalQuery: query,
        files_involved: files_modified,
        tools_used,
        duration_ms,
        success,
        error_messages: error_messages.length > 0 ? error_messages : undefined,
      },
      outcome: {
        summary: outcomes.join('. '),
        lessons_learned,
        solutions_applied: solution_steps,
        patterns_identified,
      },
      metadata: {
        created: new Date(),
        salience,
        complexity: this.estimateComplexity(tools_used, files_modified, solution_steps),
        reusability: this.estimateReusability(context),
        tags: this.extractTags(query, tools_used),
        related_episodes: [], // Will be populated by finding similar episodes
      },
    };

    // Generate embedding
    const episodeText = `${episode.title} ${episode.description} ${episode.outcome.summary}`;
    episode.embedding = await this.llmService.getEmbedding?.(episodeText);

    // Store episode
    await this.episodicRepository.storeEpisode(episode);

    // If successful and high salience, consider creating a case example
    if (success && salience > 0.7) {
      await this.createCaseExample(episode, solution_steps.join('\n'));
    }

    return episode;
  }

  async extractSkills(episodes: EpisodicMemory[]): Promise<SkillDocument[]> {
    const skillMap = new Map<string, SkillDocument>();

    // Group episodes by patterns and techniques
    const patternGroups = this.groupEpisodesByPatterns(episodes);

    for (const [pattern, episodeGroup] of patternGroups) {
      const skill = await this.synthesizeSkillFromEpisodes(pattern, episodeGroup);
      skillMap.set(skill.id, skill);
    }

    // Store skills
    const skills = Array.from(skillMap.values());
    for (const skill of skills) {
      await this.episodicRepository.storeSkill(skill);
    }

    return skills;
  }

  async createCaseExample(episode: EpisodicMemory, solution_details: string): Promise<CaseExample> {
    if (!episode.context.success) {
      throw new Error("Cannot create case example from failed episode");
    }

    const case_example: CaseExample = {
      id: this.generateCaseId(episode.projectName, episode.id),
      projectName: episode.projectName,
      original_problem: episode.context.originalQuery || episode.title,
      solution_approach: episode.outcome.solutions_applied.join(' → '),
      implementation_details: solution_details,
      outcome: {
        success: true,
        issues_encountered: [],
        lessons_learned: episode.outcome.lessons_learned,
      },
      metadata: {
        created: new Date(),
        complexity: episode.metadata.complexity,
        domain: this.inferDomain(episode.context.tools_used),
        patterns_used: episode.outcome.patterns_identified,
        tools_used: episode.context.tools_used,
        reuse_count: 0,
        effectiveness_score: episode.metadata.salience,
      },
    };

    // Generate embedding
    const caseText = `${case_example.original_problem} ${case_example.solution_approach}`;
    case_example.embedding = await this.llmService.getEmbedding?.(caseText);

    await this.episodicRepository.storeCase(case_example);
    return case_example;
  }

  async generateLessonsLearned(episode: EpisodicMemory): Promise<string[]> {
    const context = `
Task: ${episode.title}
Success: ${episode.context.success}
Tools used: ${episode.context.tools_used.join(', ')}
Duration: ${episode.context.duration_ms}ms
Solutions: ${episode.outcome.solutions_applied.join(', ')}
${episode.context.error_messages ? `Errors: ${episode.context.error_messages.join(', ')}` : ''}
`;

    const prompt = `Based on this task completion, identify 3-5 key lessons learned that would help in similar future tasks:

${context}

Provide lessons in this format:
- Lesson 1: [specific lesson]
- Lesson 2: [specific lesson]
...`;

    try {
      const response = await this.llmService.summarize(prompt, {
        level: 'node' as any,
        type: 'extractive' as any,
        maxTokens: 300,
        style: 'bullet-points',
      });

      return this.parseLessonsFromResponse(response);
    } catch (error) {
      console.warn('Failed to generate lessons learned:', error);
      return this.generateFallbackLessons(episode);
    }
  }

  async identifyPatterns(episodes: EpisodicMemory[]): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = [];
    const patternGroups = this.groupEpisodesByPatterns(episodes);

    for (const [patternName, episodeGroup] of patternGroups) {
      if (episodeGroup.length < 2) continue; // Need at least 2 episodes to identify a pattern

      const insight: PatternInsight = {
        pattern_name: patternName,
        description: await this.generatePatternDescription(episodeGroup),
        examples: episodeGroup.slice(0, 3).map(ep => ep.title),
        conditions: await this.identifyPatternConditions(episodeGroup),
        benefits: await this.identifyPatternBenefits(episodeGroup),
        risks: await this.identifyPatternRisks(episodeGroup),
        confidence: Math.min(0.9, episodeGroup.length * 0.2), // Higher confidence with more examples
        supporting_episodes: episodeGroup.map(ep => ep.id),
      };

      patterns.push(insight);
    }

    return patterns;
  }

  private async extractLessonsFromContext(context: TaskCompletionContext): Promise<string[]> {
    const lessons: string[] = [];

    if (!context.success && context.error_messages) {
      lessons.push(`Error Resolution: ${context.error_messages[0]}`);
    }

    if (context.duration_ms > 30000) { // More than 30 seconds
      lessons.push(`Performance: Task took ${Math.round(context.duration_ms / 1000)}s - consider optimization`);
    }

    if (context.tools_used.length > 5) {
      lessons.push(`Tool Usage: Used ${context.tools_used.length} different tools - possible complexity indicator`);
    }

    if (context.files_modified.length > 10) {
      lessons.push(`Scope: Modified ${context.files_modified.length} files - large scope task`);
    }

    // Add success-specific lessons
    if (context.success) {
      lessons.push(`Success Pattern: ${context.solution_steps[0]}`);
    }

    return lessons;
  }

  private async identifyAppliedPatterns(solution_steps: string[], tools_used: string[]): Promise<string[]> {
    const patterns: string[] = [];

    // Identify common patterns based on tools and steps
    if (tools_used.includes('git') && solution_steps.some(step => step.includes('commit'))) {
      patterns.push('Version Control Workflow');
    }

    if (tools_used.includes('npm') && tools_used.includes('typescript')) {
      patterns.push('TypeScript Development');
    }

    if (solution_steps.some(step => step.includes('test'))) {
      patterns.push('Test-Driven Development');
    }

    if (solution_steps.some(step => step.toLowerCase().includes('refactor'))) {
      patterns.push('Code Refactoring');
    }

    return patterns;
  }

  private groupEpisodesByPatterns(episodes: EpisodicMemory[]): Map<string, EpisodicMemory[]> {
    const groups = new Map<string, EpisodicMemory[]>();

    for (const episode of episodes) {
      for (const pattern of episode.outcome.patterns_identified) {
        if (!groups.has(pattern)) {
          groups.set(pattern, []);
        }
        groups.get(pattern)!.push(episode);
      }
    }

    return groups;
  }

  private async synthesizeSkillFromEpisodes(pattern: string, episodes: EpisodicMemory[]): Promise<SkillDocument> {
    const successfulEpisodes = episodes.filter(ep => ep.context.success);
    const failedEpisodes = episodes.filter(ep => !ep.context.success);

    return {
      id: this.generateSkillId(pattern),
      category: this.inferSkillCategory(pattern),
      name: pattern,
      description: `Skill derived from ${episodes.length} episodes`,
      content: {
        principle: `Apply ${pattern} pattern for better outcomes`,
        examples: successfulEpisodes.slice(0, 3).map(ep => ep.outcome.summary),
        patterns: [pattern],
        antipatterns: failedEpisodes.map(ep => `Avoid: ${ep.outcome.summary}`),
        prerequisites: [],
        related_skills: [],
      },
      usage_stats: {
        times_applied: episodes.length,
        success_rate: successfulEpisodes.length / episodes.length,
        last_used: new Date(),
        effectiveness_score: successfulEpisodes.reduce((sum, ep) => sum + ep.metadata.salience, 0) / successfulEpisodes.length,
      },
      metadata: {
        created: new Date(),
        updated: new Date(),
        source_episodes: episodes.map(ep => ep.id),
        confidence: Math.min(0.9, episodes.length * 0.15),
        tags: [pattern.toLowerCase().replace(/\s+/g, '-')],
      },
    };
  }

  private estimateComplexity(tools_used: string[], files_modified: string[], solution_steps: string[]): number {
    let complexity = 1;

    complexity += tools_used.length * 0.5;
    complexity += Math.min(files_modified.length * 0.3, 3);
    complexity += Math.min(solution_steps.length * 0.4, 4);

    return Math.min(10, Math.max(1, Math.round(complexity)));
  }

  private estimateReusability(context: TaskCompletionContext): number {
    let reusability = 0.5;

    if (context.success) reusability += 0.3;
    if (context.solution_steps.length > 2 && context.solution_steps.length < 8) reusability += 0.2;
    if (context.files_modified.length < 5) reusability += 0.2;

    return Math.min(1, Math.max(0, reusability));
  }

  private extractTags(query: string, tools_used: string[]): string[] {
    const tags: string[] = [];
    
    // Add tool-based tags
    tags.push(...tools_used.map(tool => tool.toLowerCase()));
    
    // Add query-based tags (simple keyword extraction)
    const keywords = query.toLowerCase().match(/\b\w{4,}\b/g) || [];
    tags.push(...keywords.slice(0, 5));

    return [...new Set(tags)]; // Remove duplicates
  }

  private generateTitle(query: string, success: boolean): string {
    const status = success ? "Completed" : "Failed";
    const shortQuery = query.length > 50 ? query.substring(0, 47) + "..." : query;
    return `${status}: ${shortQuery}`;
  }

  private generateDescription(context: TaskCompletionContext): string {
    const duration = Math.round(context.duration_ms / 1000);
    const toolsText = context.tools_used.slice(0, 3).join(', ');
    const moreTools = context.tools_used.length > 3 ? ` (+${context.tools_used.length - 3} more)` : '';
    
    return `Task took ${duration}s using ${toolsText}${moreTools}. Modified ${context.files_modified.length} files.`;
  }

  private parseLessonsFromResponse(response: string): string[] {
    return response
      .split('\n')
      .filter(line => line.trim().startsWith('- '))
      .map(line => line.replace(/^- /, '').trim())
      .filter(lesson => lesson.length > 0);
  }

  private generateFallbackLessons(episode: EpisodicMemory): string[] {
    return [
      `Task complexity: ${episode.metadata.complexity}/10`,
      `Used ${episode.context.tools_used.length} different tools`,
      `${episode.context.success ? 'Success' : 'Failure'} outcome`,
    ];
  }

  private async generatePatternDescription(episodes: EpisodicMemory[]): Promise<string> {
    return `Pattern identified from ${episodes.length} similar episodes`;
  }

  private async identifyPatternConditions(episodes: EpisodicMemory[]): Promise<string[]> {
    return [`When dealing with ${episodes[0].outcome.patterns_identified[0]} scenarios`];
  }

  private async identifyPatternBenefits(episodes: EpisodicMemory[]): Promise<string[]> {
    const successRate = episodes.filter(ep => ep.context.success).length / episodes.length;
    return [`${Math.round(successRate * 100)}% success rate when applied`];
  }

  private async identifyPatternRisks(episodes: EpisodicMemory[]): Promise<string[]> {
    const failures = episodes.filter(ep => !ep.context.success);
    return failures.length > 0 ? [`May fail if ${failures[0].outcome.summary}`] : ['Low risk pattern'];
  }

  private inferDomain(tools_used: string[]): string {
    if (tools_used.some(tool => ['postgresql', 'mysql', 'mongodb'].includes(tool.toLowerCase()))) {
      return 'database';
    }
    if (tools_used.some(tool => ['react', 'vue', 'angular'].includes(tool.toLowerCase()))) {
      return 'frontend';
    }
    if (tools_used.some(tool => ['express', 'fastapi', 'spring'].includes(tool.toLowerCase()))) {
      return 'backend';
    }
    if (tools_used.some(tool => ['docker', 'kubernetes', 'terraform'].includes(tool.toLowerCase()))) {
      return 'devops';
    }
    return 'general';
  }

  private inferSkillCategory(pattern: string): SkillCategory {
    const patternLower = pattern.toLowerCase();
    if (patternLower.includes('code') || patternLower.includes('implement')) {
      return SkillCategory.CODING;
    }
    if (patternLower.includes('debug') || patternLower.includes('fix')) {
      return SkillCategory.DEBUGGING;
    }
    if (patternLower.includes('design') || patternLower.includes('architecture')) {
      return SkillCategory.DESIGN;
    }
    if (patternLower.includes('optim') || patternLower.includes('performance')) {
      return SkillCategory.OPTIMIZATION;
    }
    if (patternLower.includes('research') || patternLower.includes('analyze')) {
      return SkillCategory.RESEARCH;
    }
    return SkillCategory.ANALYSIS;
  }

  private generateEpisodeId(projectName: string, timestamp: number): string {
    return `episode-${projectName}-${timestamp}`;
  }

  private generateCaseId(projectName: string, episodeId: string): string {
    return `case-${projectName}-${episodeId}`;
  }

  private generateSkillId(pattern: string): string {
    return `skill-${pattern.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  }
}
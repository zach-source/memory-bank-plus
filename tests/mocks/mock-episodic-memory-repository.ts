import { 
  EpisodicMemoryRepository 
} from '../../src/data/protocols/episodic-memory-repository.js';
import {
  EpisodicMemory,
  SkillDocument,
  CaseExample,
  EpisodicType,
  SkillCategory
} from '../../src/domain/entities/index.js';

export class MockEpisodicMemoryRepository implements EpisodicMemoryRepository {
  private episodes: EpisodicMemory[] = [];
  private skills: SkillDocument[] = [];
  private cases: CaseExample[] = [];

  async storeEpisode(episode: EpisodicMemory): Promise<void> {
    this.episodes.push(episode);
  }

  async getEpisodesByType(projectName: string, type: EpisodicType, limit = 10): Promise<EpisodicMemory[]> {
    return this.episodes
      .filter(ep => ep.projectName === projectName && ep.type === type)
      .slice(0, limit);
  }

  async searchEpisodes(query: string, projectName?: string, limit = 10): Promise<EpisodicMemory[]> {
    const queryLower = query.toLowerCase();
    return this.episodes
      .filter(ep => {
        const matchesProject = !projectName || ep.projectName === projectName;
        const matchesQuery = ep.title.toLowerCase().includes(queryLower) ||
                            ep.description.toLowerCase().includes(queryLower);
        return matchesProject && matchesQuery;
      })
      .slice(0, limit);
  }

  async findRelatedEpisodes(episodeId: string, limit = 5): Promise<EpisodicMemory[]> {
    return this.episodes
      .filter(ep => ep.id !== episodeId)
      .slice(0, limit);
  }

  async storeSkill(skill: SkillDocument): Promise<void> {
    this.skills.push(skill);
  }

  async getSkillsByCategory(category: SkillCategory, limit = 10): Promise<SkillDocument[]> {
    return this.skills
      .filter(skill => skill.category === category)
      .slice(0, limit);
  }

  async searchSkills(query: string, limit = 10): Promise<SkillDocument[]> {
    const queryLower = query.toLowerCase();
    return this.skills
      .filter(skill => 
        skill.name.toLowerCase().includes(queryLower) ||
        skill.description.toLowerCase().includes(queryLower)
      )
      .slice(0, limit);
  }

  async updateSkillUsage(skillId: string, success: boolean): Promise<void> {
    const skill = this.skills.find(s => s.id === skillId);
    if (skill) {
      skill.usage_stats.times_applied += 1;
      skill.usage_stats.last_used = new Date();
      if (success) {
        skill.usage_stats.success_rate = 
          (skill.usage_stats.success_rate * (skill.usage_stats.times_applied - 1) + 1) / 
          skill.usage_stats.times_applied;
      }
    }
  }

  async storeCase(case_example: CaseExample): Promise<void> {
    this.cases.push(case_example);
  }

  async findSimilarCases(problem_description: string, domain?: string, limit = 5): Promise<CaseExample[]> {
    const problemLower = problem_description.toLowerCase();
    return this.cases
      .filter(c => {
        const matchesDomain = !domain || c.metadata.domain === domain;
        const matchesProblem = c.original_problem.toLowerCase().includes(problemLower);
        return matchesDomain && matchesProblem;
      })
      .sort((a, b) => b.metadata.effectiveness_score - a.metadata.effectiveness_score)
      .slice(0, limit);
  }

  async getMostEffectiveCases(domain?: string, limit = 10): Promise<CaseExample[]> {
    return this.cases
      .filter(c => !domain || c.metadata.domain === domain)
      .sort((a, b) => b.metadata.effectiveness_score - a.metadata.effectiveness_score)
      .slice(0, limit);
  }

  async updateCaseReuse(caseId: string): Promise<void> {
    const case_example = this.cases.find(c => c.id === caseId);
    if (case_example) {
      case_example.metadata.reuse_count += 1;
    }
  }

  async getMemoryStats(projectName?: string): Promise<{
    total_episodes: number;
    total_skills: number;
    total_cases: number;
    avg_salience: number;
    most_active_patterns: string[];
    recent_learnings: EpisodicMemory[];
  }> {
    const episodes = projectName 
      ? this.episodes.filter(ep => ep.projectName === projectName)
      : this.episodes;

    const avgSalience = episodes.length > 0 
      ? episodes.reduce((sum, ep) => sum + ep.metadata.salience, 0) / episodes.length
      : 0;

    const patterns = episodes
      .flatMap(ep => ep.outcome.patterns_identified)
      .reduce((acc, pattern) => {
        acc[pattern] = (acc[pattern] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostActivePatterns = Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    return {
      total_episodes: episodes.length,
      total_skills: this.skills.length,
      total_cases: this.cases.length,
      avg_salience: avgSalience,
      most_active_patterns: mostActivePatterns,
      recent_learnings: episodes
        .sort((a, b) => b.metadata.created.getTime() - a.metadata.created.getTime())
        .slice(0, 5),
    };
  }

  // Helper methods for testing
  clear(): void {
    this.episodes = [];
    this.skills = [];
    this.cases = [];
  }

  getStoredEpisodes(): EpisodicMemory[] {
    return [...this.episodes];
  }

  getStoredSkills(): SkillDocument[] {
    return [...this.skills];
  }

  getStoredCases(): CaseExample[] {
    return [...this.cases];
  }
}
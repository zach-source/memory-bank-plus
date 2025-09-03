import {
  EvaluationHarnessUseCase,
  FeatureComparisonReport,
  OptimizationRecommendation,
} from "../../../domain/usecases/evaluation-harness.js";
import {
  BenchmarkTask,
  EvaluationRun,
  BenchmarkReport,
  FeatureFlags,
} from "../../../domain/entities/index.js";
import {
  VectorRepository,
  SummaryRepository,
  EpisodicMemoryRepository,
  LLMService,
} from "../../protocols/index.js";
import { SearchMemoryUseCase, CompileContextUseCase } from "../../../domain/usecases/index.js";

export class EvaluationHarness implements EvaluationHarnessUseCase {
  constructor(
    private readonly searchMemory: SearchMemoryUseCase,
    private readonly compileContext: CompileContextUseCase,
    private readonly vectorRepository: VectorRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly episodicRepository: EpisodicMemoryRepository,
    private readonly llmService: LLMService
  ) {}

  async runBenchmark(
    task: BenchmarkTask,
    featureFlags: FeatureFlags
  ): Promise<EvaluationRun> {
    const run_id = `eval-${task.id}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Setup test data if needed
      await this.setupBenchmarkData(task);

      // Configure features
      await this.configureFeatures(featureFlags);

      // Execute the search/retrieval task
      const search_results = await this.executeSearchTask(task, featureFlags);

      // Calculate metrics
      const metrics = await this.calculateMetrics(task, search_results);

      const duration = Date.now() - startTime;

      return {
        id: run_id,
        benchmark_task: task,
        configuration: {
          features_enabled: featureFlags,
          model_config: {},
          memory_config: {},
        },
        results: {
          success: metrics.f1_score >= (task.success_criteria.min_precision + task.success_criteria.min_recall) / 2,
          recall: metrics.recall,
          precision: metrics.precision,
          f1_score: metrics.f1_score,
          response_time_ms: duration,
          tokens_used: metrics.tokens_used,
          retrieved_results: search_results.results.map(r => r.file.name),
          quality_score: this.calculateQualityScore(metrics),
        },
        metadata: {
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: duration,
          errors: [],
          notes: [`Used features: ${Object.entries(featureFlags).filter(([_, v]) => v).map(([k, _]) => k).join(', ')}`],
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        id: run_id,
        benchmark_task: task,
        configuration: {
          features_enabled: featureFlags,
          model_config: {},
          memory_config: {},
        },
        results: {
          success: false,
          recall: 0,
          precision: 0,
          f1_score: 0,
          response_time_ms: duration,
          tokens_used: 0,
          retrieved_results: [],
          quality_score: 0,
        },
        metadata: {
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: duration,
          errors: [error instanceof Error ? error.message : String(error)],
          notes: ['Benchmark failed'],
        },
      };
    }
  }

  async runBenchmarkSuite(
    tasks: BenchmarkTask[],
    featureConfigurations: FeatureFlags[]
  ): Promise<BenchmarkReport> {
    const report_id = `suite-${Date.now()}`;
    const all_runs: EvaluationRun[] = [];

    console.log(`Running benchmark suite with ${tasks.length} tasks and ${featureConfigurations.length} feature configurations...`);

    // Run all combinations
    for (const featureConfig of featureConfigurations) {
      for (const task of tasks) {
        console.log(`Running task "${task.name}" with features: ${JSON.stringify(featureConfig)}`);
        const run = await this.runBenchmark(task, featureConfig);
        all_runs.push(run);
      }
    }

    // Calculate aggregated results
    const aggregated = this.calculateAggregatedResults(all_runs, featureConfigurations);
    const insights = this.generateInsights(all_runs, featureConfigurations);

    return {
      id: report_id,
      name: `Benchmark Suite ${new Date().toISOString()}`,
      runs: all_runs,
      aggregated_results: aggregated,
      insights,
      created: new Date(),
    };
  }

  async compareFeatures(
    baseFeatures: FeatureFlags,
    experimentFeatures: FeatureFlags[],
    tasks: BenchmarkTask[]
  ): Promise<FeatureComparisonReport> {
    // Run baseline
    const baseline_runs: EvaluationRun[] = [];
    for (const task of tasks) {
      baseline_runs.push(await this.runBenchmark(task, baseFeatures));
    }

    const baseline_metrics = this.calculateAvgMetrics(baseline_runs);

    // Run experiments
    const experiments = [];
    for (const features of experimentFeatures) {
      const exp_runs: EvaluationRun[] = [];
      for (const task of tasks) {
        exp_runs.push(await this.runBenchmark(task, features));
      }

      const exp_metrics = this.calculateAvgMetrics(exp_runs);
      
      experiments.push({
        features,
        performance_delta: ((exp_metrics.avg_f1 - baseline_metrics.avg_f1) / baseline_metrics.avg_f1) * 100,
        cost_delta: ((exp_metrics.avg_tokens - baseline_metrics.avg_tokens) / baseline_metrics.avg_tokens) * 100,
        latency_delta: ((exp_metrics.avg_latency - baseline_metrics.avg_latency) / baseline_metrics.avg_latency) * 100,
        significance: this.calculateSignificance(baseline_runs, exp_runs),
        recommendation: this.getRecommendation(exp_metrics, baseline_metrics),
      });
    }

    const best_config = this.findBestConfiguration(baseFeatures, experiments);

    return {
      baseline: {
        features: baseFeatures,
        avg_performance: baseline_metrics.avg_f1,
        avg_cost: baseline_metrics.avg_tokens,
        avg_latency: baseline_metrics.avg_latency,
      },
      experiments,
      best_configuration: best_config,
      insights: this.generateComparisonInsights(experiments),
    };
  }

  async generateOptimizationRecommendations(
    report: BenchmarkReport
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Performance recommendations
    if (report.aggregated_results.avg_f1_score < 0.7) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        recommendation: 'Improve search relevance by tuning semantic weights or adding more training data',
        expected_improvement: 15,
        implementation_effort: 'medium',
        risks: ['May increase computational cost'],
        evidence: {
          supporting_runs: report.runs.filter(r => r.results.f1_score < 0.7).map(r => r.id),
          confidence: 0.8,
        },
      });
    }

    // Cost recommendations
    if (report.aggregated_results.avg_tokens_used > 5000) {
      recommendations.push({
        category: 'cost',
        priority: 'medium',
        recommendation: 'Enable aggressive compression to reduce token usage',
        expected_improvement: 30,
        implementation_effort: 'low',
        risks: ['May reduce response quality'],
        evidence: {
          supporting_runs: report.runs.filter(r => r.results.tokens_used > 5000).map(r => r.id),
          confidence: 0.9,
        },
      });
    }

    // Latency recommendations
    if (report.aggregated_results.avg_response_time > 2000) {
      recommendations.push({
        category: 'latency',
        priority: 'medium',
        recommendation: 'Implement caching for frequently accessed summaries',
        expected_improvement: 40,
        implementation_effort: 'medium',
        risks: ['Cache invalidation complexity'],
        evidence: {
          supporting_runs: report.runs.filter(r => r.results.response_time_ms > 2000).map(r => r.id),
          confidence: 0.7,
        },
      });
    }

    return recommendations;
  }

  private async setupBenchmarkData(task: BenchmarkTask): Promise<void> {
    if (!task.context.setup_files) return;

    // Setup test files for the benchmark
    for (const file of task.context.setup_files) {
      // In a real implementation, we'd use the file repository
      console.log(`Setting up test file: ${file.name}`);
    }
  }

  private async configureFeatures(features: FeatureFlags): Promise<void> {
    // Configure the system based on feature flags
    // This would involve enabling/disabling various components
    console.log(`Configuring features:`, features);
  }

  private async executeSearchTask(task: BenchmarkTask, features: FeatureFlags) {
    // Execute search with query expansion if enabled
    let query = task.query;
    
    if (features.hyde_expansion) {
      // Apply HyDE expansion (simplified for testing)
      query = `${task.query} ${task.context.domain}`;
    }

    return this.searchMemory.search({
      query,
      projectName: task.context.projectName,
      limit: 10,
    });
  }

  private async calculateMetrics(task: BenchmarkTask, search_results: any) {
    const retrieved = new Set(search_results.results?.map((r: any) => r.file?.name || '').filter((name: string) => name) || []);
    const expected = new Set(task.expected_results);

    const true_positives = [...retrieved].filter(name => expected.has(name as string)).length;
    const false_positives = retrieved.size - true_positives;
    const false_negatives = expected.size - true_positives;

    const precision = retrieved.size > 0 ? true_positives / retrieved.size : 0;
    const recall = expected.size > 0 ? true_positives / expected.size : 0;
    const f1_score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const content_text = search_results.results?.map((r: any) => r.file?.content || '').join(' ') || '';
    
    return {
      precision,
      recall,
      f1_score,
      tokens_used: content_text ? await this.llmService.countTokens(content_text) : 0,
    };
  }

  private calculateQualityScore(metrics: {
    precision: number;
    recall: number;
    f1_score: number;
  }): number {
    // Weighted quality score
    return (metrics.precision * 0.4 + metrics.recall * 0.4 + metrics.f1_score * 0.2);
  }

  private calculateAggregatedResults(runs: EvaluationRun[], configurations: FeatureFlags[]) {
    const successful_runs = runs.filter(r => r.results.success);
    
    const avg_recall = runs.reduce((sum, r) => sum + r.results.recall, 0) / runs.length;
    const avg_precision = runs.reduce((sum, r) => sum + r.results.precision, 0) / runs.length;
    const avg_f1_score = runs.reduce((sum, r) => sum + r.results.f1_score, 0) / runs.length;
    const avg_response_time = runs.reduce((sum, r) => sum + r.results.response_time_ms, 0) / runs.length;
    const avg_tokens_used = runs.reduce((sum, r) => sum + r.results.tokens_used, 0) / runs.length;

    // Calculate per-feature performance
    const feature_performance: Record<string, any> = {};
    
    for (const config of configurations) {
      const config_runs = runs.filter(r => 
        JSON.stringify(r.configuration.features_enabled) === JSON.stringify(config)
      );
      
      if (config_runs.length > 0) {
        const config_name = Object.entries(config)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => feature)
          .join('+');
          
        feature_performance[config_name] = {
          success_rate: config_runs.filter(r => r.results.success).length / config_runs.length,
          avg_quality: config_runs.reduce((sum, r) => sum + r.results.quality_score, 0) / config_runs.length,
          avg_tokens: config_runs.reduce((sum, r) => sum + r.results.tokens_used, 0) / config_runs.length,
          avg_latency: config_runs.reduce((sum, r) => sum + r.results.response_time_ms, 0) / config_runs.length,
        };
      }
    }

    return {
      total_tasks: runs.length,
      success_rate: successful_runs.length / runs.length,
      avg_recall,
      avg_precision,
      avg_f1_score,
      avg_response_time,
      avg_tokens_used,
      total_cost_estimate: avg_tokens_used * 0.0001, // Mock cost calculation
      feature_performance,
    };
  }

  private generateInsights(runs: EvaluationRun[], configurations: FeatureFlags[]) {
    const feature_scores = this.analyzeFeaturePerformance(runs, configurations);
    
    return {
      best_performing_features: Object.entries(feature_scores.performance)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([feature, _]) => feature),
      cost_efficiency_winners: Object.entries(feature_scores.cost_efficiency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([feature, _]) => feature),
      latency_champions: Object.entries(feature_scores.latency)
        .sort(([,a], [,b]) => a - b)
        .slice(0, 3)
        .map(([feature, _]) => feature),
      quality_leaders: Object.entries(feature_scores.quality)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([feature, _]) => feature),
      recommendations: this.generateBasicRecommendations(feature_scores),
    };
  }

  private analyzeFeaturePerformance(runs: EvaluationRun[], configurations: FeatureFlags[]) {
    const features = ['hierarchical_summaries', 'compression', 'reflexive_cases', 'hyde_expansion'];
    const scores = {
      performance: {} as Record<string, number>,
      cost_efficiency: {} as Record<string, number>,
      latency: {} as Record<string, number>,
      quality: {} as Record<string, number>,
    };

    for (const feature of features) {
      const with_feature = runs.filter(r => (r.configuration.features_enabled as any)[feature]);
      const without_feature = runs.filter(r => !(r.configuration.features_enabled as any)[feature]);

      if (with_feature.length > 0 && without_feature.length > 0) {
        const avg_with = this.calculateAvgMetrics(with_feature);
        const avg_without = this.calculateAvgMetrics(without_feature);

        scores.performance[feature] = avg_with.avg_f1;
        scores.cost_efficiency[feature] = avg_with.avg_f1 / (avg_with.avg_tokens / 1000);
        scores.latency[feature] = avg_with.avg_latency;
        scores.quality[feature] = avg_with.avg_quality;
      }
    }

    return scores;
  }

  private calculateAvgMetrics(runs: EvaluationRun[]) {
    return {
      avg_f1: runs.reduce((sum, r) => sum + r.results.f1_score, 0) / runs.length,
      avg_tokens: runs.reduce((sum, r) => sum + r.results.tokens_used, 0) / runs.length,
      avg_latency: runs.reduce((sum, r) => sum + r.results.response_time_ms, 0) / runs.length,
      avg_quality: runs.reduce((sum, r) => sum + r.results.quality_score, 0) / runs.length,
    };
  }

  private calculateSignificance(baseline: EvaluationRun[], experiment: EvaluationRun[]): number {
    // Simplified significance test
    const baseline_f1 = baseline.map(r => r.results.f1_score);
    const experiment_f1 = experiment.map(r => r.results.f1_score);

    const baseline_avg = baseline_f1.reduce((a, b) => a + b, 0) / baseline_f1.length;
    const experiment_avg = experiment_f1.reduce((a, b) => a + b, 0) / experiment_f1.length;

    const difference = Math.abs(experiment_avg - baseline_avg);
    return Math.min(1, difference * 10); // Simple significance proxy
  }

  private getRecommendation(
    experiment: ReturnType<typeof this.calculateAvgMetrics>,
    baseline: ReturnType<typeof this.calculateAvgMetrics>
  ): 'adopt' | 'reject' | 'investigate' {
    const performance_improvement = experiment.avg_f1 - baseline.avg_f1;
    const cost_increase = (experiment.avg_tokens - baseline.avg_tokens) / baseline.avg_tokens;

    if (performance_improvement > 0.1 && cost_increase < 0.5) {
      return 'adopt';
    } else if (performance_improvement < -0.05 || cost_increase > 1.0) {
      return 'reject';
    } else {
      return 'investigate';
    }
  }

  private findBestConfiguration(
    baseline: FeatureFlags,
    experiments: Array<{ features: FeatureFlags; performance_delta: number; cost_delta: number }>
  ): FeatureFlags {
    const best = experiments.reduce((best, exp) => {
      const score = exp.performance_delta - (exp.cost_delta * 0.1); // Weight performance over cost
      const best_score = best.performance_delta - (best.cost_delta * 0.1);
      return score > best_score ? exp : best;
    });

    return best ? best.features : baseline;
  }

  private generateComparisonInsights(experiments: Array<{ features: FeatureFlags; performance_delta: number }>): string[] {
    return experiments
      .filter(exp => Math.abs(exp.performance_delta) > 5)
      .map(exp => `Configuration ${JSON.stringify(exp.features)} shows ${exp.performance_delta.toFixed(1)}% performance change`)
      .slice(0, 5);
  }

  private generateBasicRecommendations(feature_scores: any): string[] {
    const recommendations: string[] = [];

    // Find best performing feature
    const best_feature = Object.entries(feature_scores.performance)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    if (best_feature) {
      recommendations.push(`Enable ${best_feature[0]} for best performance`);
    }

    // Find most cost-efficient feature
    const most_efficient = Object.entries(feature_scores.cost_efficiency)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    if (most_efficient) {
      recommendations.push(`Use ${most_efficient[0]} for cost efficiency`);
    }

    return recommendations;
  }
}
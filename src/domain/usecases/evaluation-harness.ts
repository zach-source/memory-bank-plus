import { 
  BenchmarkTask, 
  EvaluationRun, 
  BenchmarkReport, 
  FeatureFlags 
} from "../entities/index.js";

export interface EvaluationHarnessUseCase {
  /**
   * Run a single benchmark task
   */
  runBenchmark(
    task: BenchmarkTask,
    featureFlags: FeatureFlags
  ): Promise<EvaluationRun>;

  /**
   * Run a full benchmark suite
   */
  runBenchmarkSuite(
    tasks: BenchmarkTask[],
    featureConfigurations: FeatureFlags[]
  ): Promise<BenchmarkReport>;

  /**
   * Compare feature combinations
   */
  compareFeatures(
    baseFeatures: FeatureFlags,
    experimentFeatures: FeatureFlags[],
    tasks: BenchmarkTask[]
  ): Promise<FeatureComparisonReport>;

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(
    report: BenchmarkReport
  ): Promise<OptimizationRecommendation[]>;
}

export interface FeatureComparisonReport {
  baseline: {
    features: FeatureFlags;
    avg_performance: number;
    avg_cost: number;
    avg_latency: number;
  };
  experiments: Array<{
    features: FeatureFlags;
    performance_delta: number;
    cost_delta: number;
    latency_delta: number;
    significance: number;      // Statistical significance
    recommendation: 'adopt' | 'reject' | 'investigate';
  }>;
  best_configuration: FeatureFlags;
  insights: string[];
}

export interface OptimizationRecommendation {
  category: 'performance' | 'cost' | 'quality' | 'latency';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  expected_improvement: number; // Percentage improvement
  implementation_effort: 'low' | 'medium' | 'high';
  risks: string[];
  evidence: {
    supporting_runs: string[];
    confidence: number;
  };
}
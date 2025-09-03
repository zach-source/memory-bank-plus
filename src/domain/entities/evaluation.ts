export interface BenchmarkTask {
  id: string;
  name: string;
  description: string;
  query: string;
  expected_results: string[];  // Expected file names or content snippets
  context: {
    projectName: string;
    domain: string;
    complexity: number;
    setup_files?: Array<{
      name: string;
      content: string;
      metadata?: Record<string, any>;
    }>;
  };
  success_criteria: {
    min_recall: number;       // Minimum recall for retrieval tasks
    min_precision: number;    // Minimum precision for retrieval tasks
    max_response_time_ms: number;
    max_tokens_used: number;
  };
}

export interface EvaluationRun {
  id: string;
  benchmark_task: BenchmarkTask;
  configuration: {
    features_enabled: FeatureFlags;
    model_config: Record<string, any>;
    memory_config: Record<string, any>;
  };
  results: {
    success: boolean;
    recall: number;
    precision: number;
    f1_score: number;
    response_time_ms: number;
    tokens_used: number;
    cost_estimate?: number;
    retrieved_results: string[];
    quality_score: number;    // 0-1, subjective quality
  };
  metadata: {
    started_at: Date;
    completed_at: Date;
    duration_ms: number;
    errors: string[];
    notes: string[];
  };
}

export interface FeatureFlags {
  hierarchical_summaries: boolean;
  compression: boolean;
  reflexive_cases: boolean;
  hyde_expansion: boolean;
  adaptive_policies: boolean;
  background_jobs: boolean;
}

export interface BenchmarkReport {
  id: string;
  name: string;
  runs: EvaluationRun[];
  aggregated_results: {
    total_tasks: number;
    success_rate: number;
    avg_recall: number;
    avg_precision: number;
    avg_f1_score: number;
    avg_response_time: number;
    avg_tokens_used: number;
    total_cost_estimate: number;
    feature_performance: Record<string, {
      success_rate: number;
      avg_quality: number;
      avg_tokens: number;
      avg_latency: number;
    }>;
  };
  insights: {
    best_performing_features: string[];
    cost_efficiency_winners: string[];
    latency_champions: string[];
    quality_leaders: string[];
    recommendations: string[];
  };
  created: Date;
}
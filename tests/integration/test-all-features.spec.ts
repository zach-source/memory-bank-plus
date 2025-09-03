import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorRepository } from '../../src/infra/vector/qdrant-vector-repository.js';
import { QdrantSummaryRepository } from '../../src/infra/vector/qdrant-summary-repository.js';
import { MockLLMService } from '../../src/infra/llm/mock-llm-service.js';
import { HyDEQueryExpansionService } from '../../src/infra/services/hyde-query-expansion-service.js';
import { AdaptivePolicyServiceImpl } from '../../src/infra/services/adaptive-policy-service.js';
import { YamlFrontMatterParser } from '../../src/infra/parsers/yaml-front-matter-parser.js';
import { SearchMemory } from '../../src/data/usecases/search-memory/search-memory.js';
import { CompileContext } from '../../src/data/usecases/compile-context/compile-context.js';
import { ReflexiveLearning } from '../../src/data/usecases/reflexive-learning/reflexive-learning.js';
import { GenerateOrRetrieve } from '../../src/data/usecases/generate-or-retrieve/generate-or-retrieve.js';
import { EvaluationHarness } from '../../src/data/usecases/evaluation-harness/evaluation-harness.js';
import { BackgroundJobScheduler } from '../../src/infra/jobs/background-job-scheduler.js';
import { MockEpisodicMemoryRepository } from '../mocks/mock-episodic-memory-repository.js';
import { 
  EnhancedFile, 
  SearchQuery, 
  EpisodicType, 
  SummaryLevel,
  BenchmarkTask,
  FeatureFlags 
} from '../../src/domain/entities/index.js';

describe('Comprehensive Feature Testing', () => {
  let vectorRepo: QdrantVectorRepository;
  let summaryRepo: QdrantSummaryRepository;
  let llmService: MockLLMService;
  let queryExpansion: HyDEQueryExpansionService;
  let policyService: AdaptivePolicyServiceImpl;
  let searchMemory: SearchMemory;
  let compileContext: CompileContext;
  let reflexiveLearning: ReflexiveLearning;
  let generateOrRetrieve: GenerateOrRetrieve;
  let evaluationHarness: EvaluationHarness;
  let jobScheduler: BackgroundJobScheduler;
  let mockEpisodicRepo: MockEpisodicMemoryRepository;

  const mockQdrantConfig = {
    host: 'localhost',
    port: 6333,
  };

  beforeEach(async () => {
    // Initialize all services
    vectorRepo = new QdrantVectorRepository(mockQdrantConfig);
    summaryRepo = new QdrantSummaryRepository(mockQdrantConfig);
    llmService = new MockLLMService();
    queryExpansion = new HyDEQueryExpansionService(llmService);
    policyService = new AdaptivePolicyServiceImpl();
    mockEpisodicRepo = new MockEpisodicMemoryRepository();
    
    // Initialize use cases
    searchMemory = new SearchMemory(vectorRepo);
    compileContext = new CompileContext(vectorRepo, summaryRepo, llmService);
    reflexiveLearning = new ReflexiveLearning(
      mockEpisodicRepo,
      llmService,
      policyService
    );
    generateOrRetrieve = new GenerateOrRetrieve(
      mockEpisodicRepo,
      llmService,
      policyService
    );
    evaluationHarness = new EvaluationHarness(
      searchMemory,
      compileContext,
      vectorRepo,
      summaryRepo,
      mockEpisodicRepo,
      llmService
    );
    
    jobScheduler = new BackgroundJobScheduler();

    // Mock Qdrant client to avoid actual connections during tests
    vi.spyOn(QdrantClient.prototype, 'getCollections').mockResolvedValue({ collections: [] });
    vi.spyOn(QdrantClient.prototype, 'createCollection').mockResolvedValue({} as any);
    vi.spyOn(QdrantClient.prototype, 'createPayloadIndex').mockResolvedValue({} as any);
    vi.spyOn(QdrantClient.prototype, 'upsert').mockResolvedValue({} as any);
    vi.spyOn(QdrantClient.prototype, 'search').mockResolvedValue([
      {
        id: 'test-point',
        score: 0.9,
        payload: {
          projectName: 'integration-test',
          fileName: 'auth.ts',
          content: 'Authentication implementation with JWT tokens and password hashing.',
          tags: ['auth', 'security'],
          updated: new Date().toISOString(),
        },
        vector: new Array(384).fill(0.1),
      },
    ]);
    vi.spyOn(QdrantClient.prototype, 'retrieve').mockResolvedValue([
      {
        id: 'test-project:test-file.md',
        payload: {
          projectName: 'test-project',
          fileName: 'test-file.md',
          frequency: 1,
          lastAccessed: new Date().toISOString(),
        },
        vector: new Array(384).fill(0.1),
      },
    ]);
    vi.spyOn(QdrantClient.prototype, 'count').mockResolvedValue({ count: 1 });
    vi.spyOn(QdrantClient.prototype, 'delete').mockResolvedValue({} as any);
    vi.spyOn(QdrantClient.prototype, 'scroll').mockResolvedValue({ points: [] } as any);
  });

  afterEach(() => {
    jobScheduler.stop();
    mockEpisodicRepo.clear();
    vi.clearAllMocks();
  });

  describe('1. Core Infrastructure', () => {
    it('should initialize vector repository without errors', async () => {
      expect(async () => {
        await vectorRepo.initialize();
      }).not.toThrow();
    });

    it('should initialize summary repository without errors', async () => {
      expect(async () => {
        await summaryRepo.initialize();
      }).not.toThrow();
    });

    it('should validate LLM service availability', async () => {
      const available = await llmService.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('2. YAML Front-Matter Parser', () => {
    it('should parse valid YAML front-matter', () => {
      const content = `---
tags: [test, demo]
task: "Testing feature"
salience: 0.8
---
This is the main content.
`;

      const parsed = YamlFrontMatterParser.parse(content);
      expect(parsed.frontMatter?.tags).toEqual(['test', 'demo']);
      expect(parsed.frontMatter?.task).toBe('Testing feature');
      expect(parsed.frontMatter?.salience).toBe(0.8);
      expect(parsed.content.trim()).toBe('This is the main content.');
    });

    it('should handle content without front-matter', () => {
      const content = 'Just regular content without metadata.';
      const parsed = YamlFrontMatterParser.parse(content);
      
      expect(parsed.content).toBe(content);
      expect(parsed.frontMatter?.tags).toEqual([]);
    });

    it('should serialize front-matter correctly', () => {
      const fileContent = {
        content: 'Test content',
        frontMatter: {
          tags: ['test'],
          updated: new Date('2023-01-01'),
          created: new Date('2023-01-01'),
          salience: 0.9,
        },
      };

      const serialized = YamlFrontMatterParser.serialize(fileContent);
      expect(serialized).toContain('---');
      expect(serialized).toContain('tags:');
      expect(serialized).toContain('salience: 0.9');
    });
  });

  describe('3. Vector Operations', () => {
    const testFile: EnhancedFile = {
      name: 'test-file.md',
      projectName: 'test-project',
      content: 'This is test content for vector operations.',
      metadata: {
        tags: ['test', 'vector'],
        updated: new Date(),
        created: new Date(),
        salience: 0.8,
        frequency: 1,
      },
      embedding: new Float32Array(384).fill(0.1),
      contentHash: 'test-hash',
    };

    it('should store and retrieve file vectors', async () => {
      await vectorRepo.initialize();
      
      await expect(vectorRepo.upsertFile(testFile)).resolves.not.toThrow();
      
      const stats = await vectorRepo.getProjectStats('test-project');
      expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
    });

    it('should perform vector search', async () => {
      await vectorRepo.initialize();
      await vectorRepo.upsertFile(testFile);

      const query: SearchQuery = {
        query: 'test content',
        projectName: 'test-project',
        limit: 10,
      };

      const results = await vectorRepo.search(query);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should update file access statistics', async () => {
      await vectorRepo.initialize();
      await vectorRepo.upsertFile(testFile);

      await expect(
        vectorRepo.updateFileAccess('test-project', 'test-file.md')
      ).resolves.not.toThrow();
    });
  });

  describe('4. Search Memory Use Case', () => {
    it('should execute search with default parameters', async () => {
      const query: SearchQuery = {
        query: 'search test',
        projectName: 'test-project',
      };

      const response = await searchMemory.search(query);
      
      expect(response).toHaveProperty('results');
      expect(response).toHaveProperty('totalFound');
      expect(response).toHaveProperty('queryTime');
      expect(Array.isArray(response.results)).toBe(true);
    });

    it('should handle empty search results', async () => {
      // Mock empty results for this specific test
      vi.spyOn(QdrantClient.prototype, 'search').mockResolvedValueOnce([]);
      
      const query: SearchQuery = {
        query: 'nonexistent query that should return no results',
        projectName: 'empty-project',
      };

      const response = await searchMemory.search(query);
      expect(response.totalFound).toBe(0);
      expect(response.results).toHaveLength(0);
    });
  });

  describe('5. LLM Service Operations', () => {
    it('should count tokens accurately', async () => {
      const text = 'This is a test sentence for token counting.';
      const tokenCount = await llmService.countTokens(text);
      
      expect(tokenCount).toBeGreaterThan(0);
      expect(typeof tokenCount).toBe('number');
    });

    it('should generate embeddings', async () => {
      const text = 'Test text for embedding generation.';
      const embedding = await llmService.getEmbedding!(text);
      
      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(384);
      expect(embedding.some(val => val !== 0)).toBe(true);
    });

    it('should summarize content', async () => {
      const longContent = 'This is a very long piece of content that should be summarized. '.repeat(20);
      
      const summary = await llmService.summarize(longContent, {
        level: SummaryLevel.NODE,
        type: 'abstractive' as any,
        maxTokens: 100,
        style: 'paragraph',
      });

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
      expect(summary.length).toBeLessThan(longContent.length);
    });

    it('should compress content', async () => {
      const content = 'This is content that needs compression. It has multiple sentences. Some are more important than others.';
      
      const result = await llmService.compress(content, {
        compressionRatio: 0.5,
        method: 'balanced',
      });

      expect(result.originalContent).toBe(content);
      expect(result.compressedContent).toBeDefined();
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('6. Query Expansion Service', () => {
    it('should expand query with HyDE', async () => {
      const query = 'how to implement authentication';
      
      const hydeResult = await queryExpansion.expandWithHyDE(query);
      
      expect(hydeResult.original_query).toBe(query);
      expect(hydeResult.hypothetical_document).toBeDefined();
      expect(hydeResult.key_concepts.length).toBeGreaterThan(0);
      expect(hydeResult.confidence_score).toBeGreaterThan(0);
    });

    it('should generate semantic variations', async () => {
      const query = 'fix database connection issue';
      
      const variations = await queryExpansion.generateSemanticVariations(query, 3);
      
      expect(Array.isArray(variations)).toBe(true);
      expect(variations.length).toBeGreaterThan(0);
      expect(variations.every(v => typeof v === 'string')).toBe(true);
    });

    it('should expand keywords', async () => {
      const query = 'create API endpoint';
      
      const keywords = await queryExpansion.expandKeywords(query);
      
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('create');
    });

    it('should perform hybrid query expansion', async () => {
      const query = 'optimize database queries';
      
      const expansion = await queryExpansion.expandQuery(query, 'hybrid');
      
      expect(expansion.original_query).toBe(query);
      expect(expansion.expansion_method).toBe('hybrid');
      expect(expansion.expanded_queries.length).toBeGreaterThan(0);
      expect(expansion.confidence).toBeGreaterThan(0);
    });
  });

  describe('7. Adaptive Policy Service', () => {
    it('should calculate salience scores', async () => {
      const content = 'Important technical documentation about critical system functionality.';
      
      const salience = await policyService.calculateSalience(content, {
        success: true,
        complexity: 8,
        tools_used: ['typescript', 'git', 'test'],
        duration: 120000,
      });

      expect(salience).toBeGreaterThan(0);
      expect(salience).toBeLessThanOrEqual(1);
    });

    it('should make storage decisions', async () => {
      const highValueContent = 'Critical system architecture documentation with complex implementation details.';
      
      const shouldStore = await policyService.shouldStore(highValueContent, {
        type: 'episodic',
        salience: 0.9,
        complexity: 8,
        success: true,
      });

      expect(shouldStore).toBe(true);
    });

    it('should make merge decisions', async () => {
      const item1 = { content: 'Similar content about API design patterns' };
      const item2 = { content: 'Related content about API design approaches' };
      
      const shouldMerge = await policyService.shouldMerge(item1, item2, 0.95);
      expect(shouldMerge).toBe(true);
      
      const shouldNotMerge = await policyService.shouldMerge(item1, item2, 0.3);
      expect(shouldNotMerge).toBe(false);
    });

    it('should make archive decisions', async () => {
      const oldItem = {
        salience: 0.2,
        metadata: { salience: 0.2 },
      };

      const shouldArchive = await policyService.shouldArchive(oldItem, 120, 0);
      expect(shouldArchive).toBe(true);
    });
  });

  describe('8. Context Compilation', () => {
    it('should compile context within budget', async () => {
      await vectorRepo.initialize();
      await summaryRepo.initialize();

      const query = 'test context compilation';
      const budget = {
        maxTokens: 2000,
        reservedTokens: 500,
        availableTokens: 1500,
        usedTokens: 0,
        compressionTarget: 0.3,
      };

      const compilation = await compileContext.compileContext(query, budget);

      expect(compilation).toHaveProperty('id');
      expect(compilation).toHaveProperty('query');
      expect(compilation).toHaveProperty('items');
      expect(compilation.totalTokens).toBeLessThanOrEqual(budget.availableTokens);
    });

    it('should recommend appropriate budgets', async () => {
      const searchBudget = await compileContext.recommendBudget('search query', 'search');
      expect(searchBudget.maxTokens).toBeGreaterThan(0);
      expect(searchBudget.availableTokens).toBeLessThan(searchBudget.maxTokens);
      
      const qaBudget = await compileContext.recommendBudget('qa query', 'qa');
      expect(qaBudget.maxTokens).toBeGreaterThan(searchBudget.maxTokens);
    });
  });

  describe('9. Reflexive Learning', () => {
    it('should capture task completions', async () => {
      const taskContext = {
        query: 'implement user authentication',
        projectName: 'test-project',
        tools_used: ['typescript', 'jwt', 'bcrypt'],
        files_modified: ['auth.ts', 'user.model.ts'],
        duration_ms: 45000,
        success: true,
        solution_steps: ['Design auth flow', 'Implement JWT tokens', 'Add password hashing'],
        outcomes: ['Authentication system working', 'Tests passing'],
      };

      const episode = await reflexiveLearning.captureTaskCompletion(taskContext);

      expect(episode).toHaveProperty('id');
      expect(episode.type).toBe(EpisodicType.TASK_COMPLETION);
      expect(episode.metadata.salience).toBeGreaterThan(0);
      expect(episode.outcome.lessons_learned.length).toBeGreaterThan(0);
    });

    it('should generate lessons learned', async () => {
      const episode = {
        id: 'test-episode',
        projectName: 'test-project',
        type: EpisodicType.TASK_COMPLETION,
        title: 'Test Episode',
        description: 'Test description',
        context: {
          success: true,
          tools_used: ['typescript', 'vitest'],
          duration_ms: 30000,
        },
        outcome: {
          summary: 'Successfully implemented feature',
          solutions_applied: ['Clean code approach', 'Test-driven development'],
          lessons_learned: [],
          patterns_identified: ['TDD'],
        },
        metadata: {
          created: new Date(),
          salience: 0.8,
          complexity: 6,
          reusability: 0.7,
          tags: ['test'],
          related_episodes: [],
        },
      };

      const lessons = await reflexiveLearning.generateLessonsLearned(episode);
      expect(Array.isArray(lessons)).toBe(true);
      expect(lessons.length).toBeGreaterThan(0);
    });
  });

  describe('10. Generate-or-Retrieve System', () => {
    it('should make intelligent generation decisions', async () => {
      const problem = 'implement caching layer for API responses';
      const context = {
        projectName: 'test-project',
        domain: 'backend',
        complexity: 7,
        constraints: ['Redis only', 'Sub-second response'],
        available_tools: ['redis', 'typescript', 'express'],
        similar_problems_solved: [],
        urgency: 'medium' as const,
      };

      const decision = await generateOrRetrieve.shouldGenerate(problem, context);

      expect(decision).toHaveProperty('decision');
      expect(['generate', 'retrieve', 'hybrid']).toContain(decision.decision);
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.reasoning).toBeDefined();
    });

    it('should generate new solutions', async () => {
      const problem = 'implement real-time notifications';
      const context = {
        projectName: 'test-project',
        domain: 'backend',
        complexity: 8,
        constraints: ['WebSocket support', 'Scalable'],
        available_tools: ['socket.io', 'redis', 'typescript'],
        similar_problems_solved: [],
        urgency: 'high' as const,
      };

      const solution = await generateOrRetrieve.generateNewSolution(
        problem,
        context,
        context.available_tools
      );

      expect(solution).toHaveProperty('approach');
      expect(solution).toHaveProperty('implementation_plan');
      expect(solution.implementation_plan.length).toBeGreaterThan(0);
      expect(solution.success_probability).toBeGreaterThan(0);
    });
  });

  describe('11. Background Job System', () => {
    it('should start and stop job scheduler', () => {
      expect(() => {
        jobScheduler.start();
        jobScheduler.stop();
      }).not.toThrow();
    });

    it('should manage job lifecycle', () => {
      const testJob = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '60', // Every hour
        enabled: true,
        handler: async () => {
          console.log('Test job executed');
        },
        stats: {
          runs: 0,
          failures: 0,
          avgDuration: 0,
        },
      };

      jobScheduler.addJob(testJob);
      jobScheduler.enableJob('test-job');
      
      const stats = jobScheduler.getJobStats();
      const ourJob = stats.find(job => job.id === 'test-job');
      expect(ourJob).toBeDefined();
      expect(ourJob?.enabled).toBe(true);

      jobScheduler.disableJob('test-job');
      jobScheduler.removeJob('test-job');
    });
  });

  describe('12. Evaluation Harness', () => {
    it('should run benchmark tasks', async () => {
      const benchmark: BenchmarkTask = {
        id: 'test-benchmark',
        name: 'Test Search Benchmark',
        description: 'Test search functionality',
        query: 'authentication implementation',
        expected_results: ['auth.ts', 'user.model.ts'],
        context: {
          projectName: 'test-project',
          domain: 'backend',
          complexity: 5,
        },
        success_criteria: {
          min_recall: 0.6,
          min_precision: 0.7,
          max_response_time_ms: 2000,
          max_tokens_used: 1000,
        },
      };

      const featureFlags: FeatureFlags = {
        hierarchical_summaries: true,
        compression: true,
        reflexive_cases: false,
        hyde_expansion: true,
        adaptive_policies: true,
        background_jobs: false,
      };

      const run = await evaluationHarness.runBenchmark(benchmark, featureFlags);

      expect(run).toHaveProperty('id');
      expect(run).toHaveProperty('results');
      expect(run.results).toHaveProperty('recall');
      expect(run.results).toHaveProperty('precision');
      expect(run.results).toHaveProperty('f1_score');
    });

    it('should compare feature configurations', async () => {
      const baseFeatures: FeatureFlags = {
        hierarchical_summaries: false,
        compression: false,
        reflexive_cases: false,
        hyde_expansion: false,
        adaptive_policies: false,
        background_jobs: false,
      };

      const experimentFeatures: FeatureFlags = {
        hierarchical_summaries: true,
        compression: true,
        reflexive_cases: false,
        hyde_expansion: true,
        adaptive_policies: true,
        background_jobs: false,
      };

      const benchmark: BenchmarkTask = {
        id: 'comparison-test',
        name: 'Feature Comparison Test',
        description: 'Test feature impact',
        query: 'test query',
        expected_results: ['test.ts'],
        context: {
          projectName: 'test-project',
          domain: 'testing',
          complexity: 3,
        },
        success_criteria: {
          min_recall: 0.5,
          min_precision: 0.5,
          max_response_time_ms: 5000,
          max_tokens_used: 2000,
        },
      };

      const comparison = await evaluationHarness.compareFeatures(
        baseFeatures,
        [experimentFeatures],
        [benchmark]
      );

      expect(comparison).toHaveProperty('baseline');
      expect(comparison).toHaveProperty('experiments');
      expect(comparison.experiments.length).toBe(1);
      expect(comparison.experiments[0]).toHaveProperty('performance_delta');
    });
  });

  describe('13. Error Handling & Edge Cases', () => {
    it('should handle invalid search queries gracefully', async () => {
      // Mock empty results for invalid queries
      vi.spyOn(QdrantClient.prototype, 'search').mockResolvedValueOnce([]);
      
      const invalidQuery: SearchQuery = {
        query: '', // Empty query
        limit: -1, // Invalid limit
      };

      const response = await searchMemory.search(invalidQuery);
      expect(response.totalFound).toBe(0);
    });

    it('should handle missing projects gracefully', async () => {
      // Mock empty count for nonexistent project
      vi.spyOn(QdrantClient.prototype, 'count').mockResolvedValueOnce({ count: 0 });
      
      const stats = await vectorRepo.getProjectStats('nonexistent-project');
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalEmbeddings).toBe(0);
    });

    it('should handle LLM service failures gracefully', async () => {
      // Mock LLM service failure
      const originalSummarize = llmService.summarize;
      llmService.summarize = vi.fn().mockRejectedValue(new Error('LLM service down'));

      const query = 'test query with LLM failure';
      
      // Should not throw, but handle gracefully
      await expect(
        queryExpansion.expandWithHyDE(query)
      ).resolves.toHaveProperty('hypothetical_document');

      // Restore original method
      llmService.summarize = originalSummarize;
    });

    it('should validate YAML front-matter edge cases', () => {
      const invalidYaml = `---
invalid: [unclosed array
---
Content`;

      const parsed = YamlFrontMatterParser.parse(invalidYaml);
      expect(parsed.content).toBeDefined();
      expect(parsed.frontMatter?.tags).toEqual([]);
    });

    it('should handle vector repository connection failures', async () => {
      // Mock connection failure
      vi.spyOn(QdrantClient.prototype, 'getCollections').mockRejectedValue(new Error('Connection failed'));

      const failingRepo = new QdrantVectorRepository(mockQdrantConfig);
      
      await expect(failingRepo.initialize()).rejects.toThrow();
    });

    it('should handle empty embedding vectors', async () => {
      const fileWithoutEmbedding: EnhancedFile = {
        name: 'test.md',
        projectName: 'test',
        content: 'Test content',
        metadata: {
          tags: [],
          updated: new Date(),
          created: new Date(),
        },
      };

      await expect(vectorRepo.upsertFile(fileWithoutEmbedding)).resolves.not.toThrow();
    });
  });

  describe('14. Performance & Scale Testing', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = 'Large content block. '.repeat(1000); // ~20KB
      
      const startTime = Date.now();
      const tokenCount = await llmService.countTokens(largeContent);
      const duration = Date.now() - startTime;

      expect(tokenCount).toBeGreaterThan(1000);
      expect(duration).toBeLessThan(1000); // Should be fast
    });

    it('should handle many search results', async () => {
      const query: SearchQuery = {
        query: 'test',
        limit: 100, // Large result set
      };

      const response = await searchMemory.search(query);
      expect(response.results.length).toBeLessThanOrEqual(100);
    });

    it('should compress large contexts efficiently', async () => {
      const largeContent = 'This is a large document with many paragraphs. '.repeat(100);
      
      const result = await llmService.compress(largeContent, {
        compressionRatio: 0.2,
        method: 'aggressive',
      });

      expect(result.compressedTokens).toBeLessThan(result.originalTokens);
      expect(result.compressionRatio).toBeLessThan(0.5);
    });
  });

  describe('15. Integration Testing', () => {
    it('should handle complete workflow: store → search → compile', async () => {
      await vectorRepo.initialize();
      await summaryRepo.initialize();

      // Store test files
      const testFiles: EnhancedFile[] = [
        {
          name: 'auth.ts',
          projectName: 'integration-test',
          content: 'Authentication implementation with JWT tokens and password hashing.',
          metadata: {
            tags: ['auth', 'security'],
            updated: new Date(),
            created: new Date(),
            salience: 0.8,
          },
        },
        {
          name: 'user.model.ts',
          projectName: 'integration-test',
          content: 'User model with validation and database integration.',
          metadata: {
            tags: ['model', 'database'],
            updated: new Date(),
            created: new Date(),
            salience: 0.7,
          },
        },
      ];

      for (const file of testFiles) {
        file.embedding = await vectorRepo.getEmbedding(file.content);
        await vectorRepo.upsertFile(file);
      }

      // Search
      const searchResults = await searchMemory.search({
        query: 'user authentication',
        projectName: 'integration-test',
        limit: 10,
      });

      expect(searchResults.results.length).toBeGreaterThan(0);

      // Compile context
      const compilation = await compileContext.compileContext(
        'how to implement user authentication',
        {
          maxTokens: 1000,
          reservedTokens: 200,
          availableTokens: 800,
          usedTokens: 0,
          compressionTarget: 0.3,
        },
        {
          projectName: 'integration-test',
          includeFiles: true,
          includeSummaries: false,
        }
      );

      expect(compilation.items.length).toBeGreaterThan(0);
      expect(compilation.totalTokens).toBeLessThanOrEqual(800);
    });
  });
});
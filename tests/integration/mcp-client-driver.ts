#!/usr/bin/env node

import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * MCP Client Driver for Integration Testing
 * 
 * This script acts as Claude Code would, connecting to memory-bank-plus
 * via MCP protocol and exercising all advanced features.
 */

interface TestSession {
  client: Client;
  transport: StdioClientTransport;
  serverProcess: ChildProcess;
  metrics: TestMetric[];
  startTime: Date;
}

interface TestMetric {
  operation: string;
  duration: number;
  success: boolean;
  tokenCount: number;
  resultQuality: number;
  error?: string;
  timestamp: Date;
}

class MCPIntegrationDriver {
  private session: TestSession | null = null;
  private testResults: any[] = [];

  async startSession(): Promise<TestSession> {
    console.log('🚀 Starting MCP integration session...');
    
    // Set environment for memory-bank-plus
    const env = {
      ...process.env,
      MEMORY_BANK_ROOT: './test-memory-banks',
      QDRANT_HOST: 'localhost',
      QDRANT_PORT: '6333'
    };

    // Start memory-bank-plus server process
    const serverProcess = spawn('node', ['./dist/main/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    // Create MCP client
    const client = new Client({
      name: 'memory-bank-plus-test-client',
      version: '1.0.0'
    });

    // Create transport using server process
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['./dist/main/index.js'],
      env
    });

    // Connect client
    await client.connect(transport);
    console.log('✅ MCP client connected successfully');

    const session: TestSession = {
      client,
      transport,
      serverProcess,
      metrics: [],
      startTime: new Date()
    };

    this.session = session;
    return session;
  }

  async closeSession(): Promise<void> {
    if (this.session) {
      console.log('🛑 Closing MCP session...');
      
      this.session.client.close();
      this.session.serverProcess.kill();
      
      const duration = Date.now() - this.session.startTime.getTime();
      console.log(`📊 Session completed in ${duration}ms with ${this.session.metrics.length} operations`);
      
      this.session = null;
    }
  }

  async testFoundationOperations(): Promise<TestMetric[]> {
    if (!this.session) throw new Error('No active session');
    
    console.log('📡 Testing foundation operations...');
    const metrics: TestMetric[] = [];

    // Test 1: List available tools
    const listToolsStart = Date.now();
    try {
      const tools = await this.session.client.listTools();
      const duration = Date.now() - listToolsStart;
      
      metrics.push({
        operation: 'listTools',
        duration,
        success: true,
        tokenCount: this.estimateTokens(JSON.stringify(tools)),
        resultQuality: tools.tools?.length === 7 ? 1.0 : 0.5,
        timestamp: new Date()
      });
      
      console.log(`✅ Found ${tools.tools?.length} tools in ${duration}ms`);
    } catch (error) {
      metrics.push({
        operation: 'listTools',
        duration: Date.now() - listToolsStart,
        success: false,
        tokenCount: 0,
        resultQuality: 0,
        error: String(error),
        timestamp: new Date()
      });
    }

    // Test 2: Basic write operation
    const testDoc = `---
tags: [integration, test, foundation]
salience: 0.8
task: "Foundation integration testing"
created: ${new Date().toISOString()}
---

# Integration Test Document

This document validates the foundation operations of memory-bank-plus.

## Test Objectives
- Verify MCP protocol compliance
- Test YAML front-matter parsing
- Validate file storage and retrieval
- Ensure proper error handling

## Technical Details
- Uses Qdrant for vector storage
- Implements hybrid search ranking
- Supports hierarchical summarization
`;

    const writeStart = Date.now();
    try {
      const writeResult = await this.session.client.callTool({
        name: 'memory_bank_write',
        arguments: {
          projectName: 'integration-foundation',
          fileName: 'test-document.md',
          content: testDoc
        }
      });
      
      const duration = Date.now() - writeStart;
      metrics.push({
        operation: 'memory_bank_write',
        duration,
        success: true,
        tokenCount: this.estimateTokens(testDoc),
        resultQuality: writeResult ? 1.0 : 0.5,
        timestamp: new Date()
      });
      
      console.log(`✅ Write operation completed in ${duration}ms`);
    } catch (error) {
      metrics.push({
        operation: 'memory_bank_write',
        duration: Date.now() - writeStart,
        success: false,
        tokenCount: 0,
        resultQuality: 0,
        error: String(error),
        timestamp: new Date()
      });
    }

    // Test 3: Read operation
    const readStart = Date.now();
    try {
      const readResult = await this.session.client.callTool({
        name: 'memory_bank_read',
        arguments: {
          projectName: 'integration-foundation',
          fileName: 'test-document.md'
        }
      });
      
      const duration = Date.now() - readStart;
      const contentMatches = readResult.content?.[0]?.text === testDoc;
      
      metrics.push({
        operation: 'memory_bank_read',
        duration,
        success: true,
        tokenCount: this.estimateTokens(readResult.content?.[0]?.text || ''),
        resultQuality: contentMatches ? 1.0 : 0.5,
        timestamp: new Date()
      });
      
      console.log(`✅ Read operation completed in ${duration}ms, content matches: ${contentMatches}`);
    } catch (error) {
      metrics.push({
        operation: 'memory_bank_read',
        duration: Date.now() - readStart,
        success: false,
        tokenCount: 0,
        resultQuality: 0,
        error: String(error),
        timestamp: new Date()
      });
    }

    this.session.metrics.push(...metrics);
    return metrics;
  }

  async testIntelligenceFeatures(): Promise<TestMetric[]> {
    if (!this.session) throw new Error('No active session');
    
    console.log('🧠 Testing intelligence features...');
    const metrics: TestMetric[] = [];

    // Setup test data
    await this.setupComplexTestData();

    // Test 1: Semantic search with various parameters
    const searchQueries = [
      {
        query: 'authentication JWT implementation security',
        params: {
          semanticWeight: 0.6,
          recencyWeight: 0.2,
          salienceWeight: 0.2,
          limit: 5
        }
      },
      {
        query: 'database performance optimization indices',
        params: {
          semanticWeight: 0.4,
          recencyWeight: 0.3,
          frequencyWeight: 0.3,
          limit: 8
        }
      }
    ];

    for (const test of searchQueries) {
      const searchStart = Date.now();
      try {
        const searchResult = await this.session.client.callTool({
          name: 'memory_search',
          arguments: {
            query: test.query,
            projectName: 'intelligence-advanced',
            ...test.params
          }
        });
        
        const duration = Date.now() - searchStart;
        const results = searchResult.content?.[0]?.text ? JSON.parse(searchResult.content[0].text) : {};
        
        metrics.push({
          operation: 'memory_search',
          duration,
          success: true,
          tokenCount: this.estimateTokens(JSON.stringify(results)),
          resultQuality: this.calculateSearchQuality(results, test.query),
          timestamp: new Date()
        });
        
        console.log(`🔍 Search "${test.query.substring(0, 30)}..." completed in ${duration}ms`);
      } catch (error) {
        metrics.push({
          operation: 'memory_search',
          duration: Date.now() - searchStart,
          success: false,
          tokenCount: 0,
          resultQuality: 0,
          error: String(error),
          timestamp: new Date()
        });
      }
    }

    // Test 2: Context compilation with budget constraints
    const budgetTests = [
      { maxTokens: 2000, query: 'implement microservices authentication' },
      { maxTokens: 4000, query: 'design scalable database architecture' },
      { maxTokens: 1000, query: 'optimize API performance' }
    ];

    for (const test of budgetTests) {
      const compileStart = Date.now();
      try {
        const compilation = await this.session.client.callTool({
          name: 'memory_compileContext',
          arguments: {
            query: test.query,
            maxTokens: test.maxTokens,
            projectName: 'intelligence-advanced',
            includeFiles: true,
            includeSummaries: true,
            compressionTarget: 0.3
          }
        });
        
        const duration = Date.now() - compileStart;
        const result = compilation.content?.[0]?.text ? JSON.parse(compilation.content[0].text) : {};
        
        metrics.push({
          operation: 'memory_compileContext',
          duration,
          success: true,
          tokenCount: result.totalTokens || 0,
          resultQuality: this.calculateCompressionQuality(result, test.maxTokens),
          timestamp: new Date()
        });
        
        console.log(`🗜️  Context compilation (${test.maxTokens} token budget) completed in ${duration}ms`);
      } catch (error) {
        metrics.push({
          operation: 'memory_compileContext',
          duration: Date.now() - compileStart,
          success: false,
          tokenCount: 0,
          resultQuality: 0,
          error: String(error),
          timestamp: new Date()
        });
      }
    }

    this.session.metrics.push(...metrics);
    return metrics;
  }

  async testPerformanceUnderLoad(): Promise<TestMetric[]> {
    if (!this.session) throw new Error('No active session');
    
    console.log('⚡ Testing performance under load...');
    const metrics: TestMetric[] = [];

    // Test concurrent searches
    const concurrentQueries = Array.from({ length: 5 }, (_, i) => ({
      query: `concurrent performance test ${i}`,
      projectName: 'performance-stress',
      limit: 10
    }));

    const concurrentStart = Date.now();
    try {
      const concurrentResults = await Promise.all(
        concurrentQueries.map(async (params, index) => {
          const start = Date.now();
          const result = await this.session!.client.callTool({
            name: 'memory_search',
            arguments: params
          });
          
          return {
            index,
            duration: Date.now() - start,
            result,
            success: true
          };
        })
      );

      const totalDuration = Date.now() - concurrentStart;
      const avgDuration = totalDuration / concurrentQueries.length;
      
      metrics.push({
        operation: 'concurrent_searches',
        duration: totalDuration,
        success: true,
        tokenCount: concurrentResults.reduce((sum, r) => sum + this.estimateTokens(JSON.stringify(r.result)), 0),
        resultQuality: concurrentResults.every(r => r.success) ? 1.0 : 0.5,
        timestamp: new Date()
      });
      
      console.log(`🚀 ${concurrentQueries.length} concurrent searches completed in ${totalDuration}ms (avg: ${avgDuration.toFixed(0)}ms)`);
      
    } catch (error) {
      metrics.push({
        operation: 'concurrent_searches',
        duration: Date.now() - concurrentStart,
        success: false,
        tokenCount: 0,
        resultQuality: 0,
        error: String(error),
        timestamp: new Date()
      });
    }

    this.session.metrics.push(...metrics);
    return metrics;
  }

  private async setupComplexTestData(): Promise<void> {
    const complexFiles = [
      {
        name: 'advanced-auth-patterns.md',
        content: `---
tags: [authentication, security, jwt, oauth, patterns]
salience: 0.9
task: "Advanced authentication patterns"
created: ${new Date().toISOString()}
---

# Advanced Authentication Patterns

## Multi-Factor Authentication
- TOTP (Time-based One-Time Passwords)
- SMS verification
- Biometric authentication
- Hardware tokens

## OAuth 2.0 Implementation
- Authorization code flow
- PKCE for mobile apps
- Refresh token rotation
- Scope-based permissions

## JWT Best Practices
- Short-lived access tokens (15-30 min)
- Secure refresh token storage
- Claims validation
- Algorithm verification

## Security Considerations
- Rate limiting for login attempts
- Account lockout policies
- Password strength requirements
- Session management
`
      },
      {
        name: 'microservices-architecture.md',
        content: `---
tags: [microservices, architecture, scalability, patterns]
salience: 0.95
task: "Microservices architecture design"
created: ${new Date().toISOString()}
---

# Microservices Architecture Guidelines

## Service Design Principles
- Single responsibility
- Autonomous teams
- Decentralized data management
- Failure isolation

## Communication Patterns
- Synchronous: REST APIs, GraphQL
- Asynchronous: Event-driven messaging
- Service mesh for service-to-service communication
- API Gateway pattern

## Data Management
- Database per service
- Event sourcing for audit trails
- CQRS for complex domains
- Distributed transactions with Saga pattern

## Operational Excellence
- Observability (metrics, logging, tracing)
- Health checks and circuit breakers
- Blue-green deployments
- Auto-scaling based on metrics
`
      },
      {
        name: 'performance-optimization.md',
        content: `---
tags: [performance, optimization, caching, database]
salience: 0.8
task: "System performance optimization"
created: ${new Date().toISOString()}
---

# Performance Optimization Strategies

## Caching Layers
- Application-level caching (Redis)
- Database query result caching
- CDN for static assets
- Browser caching strategies

## Database Optimization
- Index optimization
- Query analysis and tuning
- Connection pooling
- Read replicas for scaling

## Application Performance
- Code profiling and bottleneck identification
- Async operations and non-blocking I/O
- Memory management
- Bundle optimization for frontend

## Monitoring and Alerts
- Application Performance Monitoring (APM)
- Database performance metrics
- Real user monitoring
- Alerting on performance degradation
`
      }
    ];

    for (const file of complexFiles) {
      if (!this.session) throw new Error('No active session');
      
      await this.session.client.callTool({
        name: 'memory_bank_write',
        arguments: {
          projectName: 'intelligence-advanced',
          fileName: file.name,
          content: file.content
        }
      });
    }

    console.log(`📚 Created ${complexFiles.length} complex test documents`);
  }

  private calculateSearchQuality(result: any, query: string): number {
    if (!result.results || result.results.length === 0) return 0;
    
    // Calculate quality based on:
    // 1. Number of results found
    // 2. Average semantic score
    // 3. Relevance to query terms
    
    const avgSemanticScore = result.results.reduce((sum: number, r: any) => 
      sum + (r.scores?.semantic || 0), 0) / result.results.length;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const relevanceScore = result.results.reduce((sum: number, r: any) => {
      const content = (r.file?.content || '').toLowerCase();
      const matches = queryWords.filter(word => content.includes(word)).length;
      return sum + (matches / queryWords.length);
    }, 0) / result.results.length;
    
    return (avgSemanticScore * 0.6) + (relevanceScore * 0.4);
  }

  private calculateCompressionQuality(result: any, maxTokens: number): number {
    if (!result.totalTokens) return 0;
    
    // Quality based on:
    // 1. Stayed within budget (1.0 if yes, penalty if over)
    // 2. Compression efficiency if applied
    // 3. Number of relevant items included
    
    let quality = result.totalTokens <= maxTokens ? 1.0 : (maxTokens / result.totalTokens);
    
    if (result.compressionApplied && result.compressionRatio) {
      // Bonus for effective compression
      quality *= (1 + (1 - result.compressionRatio) * 0.3);
    }
    
    if (result.items && result.items.length > 0) {
      // Bonus for including relevant items
      quality *= Math.min(1.2, 1 + (result.items.length * 0.05));
    }
    
    return Math.min(1.0, quality);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 0.75);
  }

  async runFullBenchmark(): Promise<any> {
    console.log('🏁 Starting full benchmark test...');
    
    try {
      await this.startSession();
      
      const phase1Metrics = await this.testFoundationOperations();
      const phase2Metrics = await this.testIntelligenceFeatures();
      const phase4Metrics = await this.testPerformanceUnderLoad();
      
      // Calculate summary
      const allMetrics = [...phase1Metrics, ...phase2Metrics, ...phase4Metrics];
      const summary = this.calculateBenchmarkSummary(allMetrics);
      
      console.log('\n🏆 BENCHMARK COMPLETE');
      console.log('='.repeat(40));
      console.log(`Total Operations: ${allMetrics.length}`);
      console.log(`Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
      console.log(`Average Response Time: ${summary.avgResponseTime.toFixed(0)}ms`);
      console.log(`Total Tokens Processed: ${summary.totalTokens.toLocaleString()}`);
      console.log(`Overall Quality Score: ${(summary.avgQuality * 100).toFixed(1)}%`);
      console.log('='.repeat(40));

      return {
        summary,
        metrics: allMetrics,
        insights: this.generateInsights(allMetrics)
      };
      
    } finally {
      await this.closeSession();
    }
  }

  private calculateBenchmarkSummary(metrics: TestMetric[]) {
    const successful = metrics.filter(m => m.success);
    
    return {
      totalOperations: metrics.length,
      successRate: successful.length / metrics.length,
      avgResponseTime: successful.reduce((sum, m) => sum + m.duration, 0) / successful.length,
      totalTokens: metrics.reduce((sum, m) => sum + m.tokenCount, 0),
      avgQuality: successful.reduce((sum, m) => sum + m.resultQuality, 0) / successful.length,
      errorCount: metrics.filter(m => !m.success).length
    };
  }

  private generateInsights(metrics: TestMetric[]): string[] {
    const insights = [];
    
    // Performance insights
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    if (avgResponseTime < 1000) {
      insights.push('✅ Excellent response times (<1s average)');
    } else if (avgResponseTime < 2000) {
      insights.push('✅ Good response times (<2s average)');
    } else {
      insights.push('⚠️  Response times need optimization (>2s average)');
    }
    
    // Quality insights
    const avgQuality = metrics.reduce((sum, m) => sum + m.resultQuality, 0) / metrics.length;
    if (avgQuality > 0.8) {
      insights.push('✅ High quality results (>80% average)');
    } else if (avgQuality > 0.6) {
      insights.push('✅ Good quality results (>60% average)');
    } else {
      insights.push('⚠️  Result quality needs improvement (<60% average)');
    }
    
    // Success rate insights
    const successRate = metrics.filter(m => m.success).length / metrics.length;
    if (successRate > 0.95) {
      insights.push('✅ Excellent reliability (>95% success rate)');
    } else if (successRate > 0.9) {
      insights.push('✅ Good reliability (>90% success rate)');
    } else {
      insights.push('⚠️  Reliability concerns (<90% success rate)');
    }

    return insights;
  }
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const driver = new MCPIntegrationDriver();
  
  driver.runFullBenchmark()
    .then(results => {
      console.log('\n📊 Final Results:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}

export { MCPIntegrationDriver };
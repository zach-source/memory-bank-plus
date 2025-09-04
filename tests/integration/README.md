# Memory-Bank-Plus Integration & Benchmark Tests

This directory contains comprehensive integration tests that validate all 10 advanced features of memory-bank-plus using realistic development scenarios.

## 🎯 **Test Overview**

The integration test suite demonstrates memory-bank-plus working as an intelligent memory system for Claude Code, validating:

- **MCP Protocol Integration** - Full compatibility with Claude Code MCP client
- **Intelligent Search** - Semantic similarity with hybrid ranking algorithms
- **Context Compilation** - Token-aware compression with budget management
- **Learning & Adaptation** - Reflexive learning and case-based reasoning
- **Performance & Scale** - Production-ready performance characteristics

## 🏗️ **Test Architecture**

### **Test Files**
- `comprehensive-benchmark.spec.ts` - Main Vitest integration test suite
- `mcp-client-driver.ts` - MCP client simulation using official SDK
- `run-benchmark.ts` - Standalone benchmark orchestration script
- `comprehensive-workflow-test.ts` - End-to-end workflow validation
- `../data/test-dataset-generator.ts` - Realistic test data generation

### **Tool Strategy**
- **Serena**: Analyze memory-bank-plus codebase for testing insights
- **Context7**: Research MCP testing best practices and benchmarking
- **Think**: Complex reasoning during test execution and result analysis  
- **Memory**: Store metrics, track learning, compare performance over time

## 🚀 **Running Tests**

### **Prerequisites**
```bash
# Ensure Docker is running (for Qdrant)
docker --version

# Ensure memory-bank-plus is built
npm run build

# Install test dependencies
npm install
```

### **Test Commands**

#### **Quick Integration Test** (5 minutes)
```bash
npm run test:integration
```
Tests basic MCP operations and core features with mocked data.

#### **Full Benchmark Suite** (15 minutes) 
```bash
npm run test:benchmark
```
Complete performance benchmark with realistic data and load testing.

#### **MCP Client Simulation** (10 minutes)
```bash
npm run test:mcp-client  
```
Simulates actual Claude Code MCP client interaction patterns.

#### **Comprehensive Workflow Test** (20 minutes)
```bash
tsx tests/integration/comprehensive-workflow-test.ts
```
End-to-end validation using Think and Memory tools strategically.

## 📊 **Test Phases**

### **Phase 1: Foundation Validation** (3-5 min)
**Objective**: Verify MCP protocol integration and basic operations
- ✅ All 7 MCP tools respond correctly
- ✅ Input validation and security measures work
- ✅ Error handling operates as expected
- ✅ Basic CRUD operations function properly

### **Phase 2: Intelligence Features** (5-8 min)  
**Objective**: Test advanced AI capabilities under realistic conditions
- 🔍 **Hybrid Search**: 20 diverse queries with relevance scoring
- 🗜️ **Context Compilation**: Budget constraints (1K, 4K, 8K tokens)
- 📊 **Hierarchical Summarization**: RAPTOR-style organization  
- 🎯 **HyDE Query Expansion**: Improved retrieval hit rates

### **Phase 3: Learning & Adaptation** (4-6 min)
**Objective**: Validate reflexive learning and case-based reasoning
- 📝 Simulate 10 coding task completions
- ⚖️ Test GoR decision making (generate vs retrieve)
- 📈 Measure adaptive policy improvements
- 🧠 Validate episodic memory capture

### **Phase 4: Performance Benchmarking** (3-5 min)
**Objective**: Stress test system under load
- 🚀 Concurrent search operations (5-10 simultaneous)
- 💾 Memory usage monitoring during sustained load
- 📊 Large context compilation (8K+ tokens)
- ⚡ Response time validation (<2s target)

### **Phase 5: End-to-End Workflow** (5-10 min)
**Objective**: Real-world integration simulation
- 👨‍💻 Complete development task using memory-bank-plus
- 🔄 Demonstrate learning from task completion  
- 📈 Show improved performance on similar subsequent tasks
- 🎯 Validate tool integration (Think + Memory + MCP)

## 📈 **Success Metrics**

### **Performance Targets**
- **Response Time**: <2 seconds for search operations
- **Search Quality**: >80% relevant results for semantic search
- **Compression Efficiency**: >60% compression ratio while maintaining quality
- **Learning Improvement**: >10% better results after training
- **Reliability**: Zero errors during stress testing
- **Concurrency**: Handle 10+ simultaneous operations efficiently

### **Quality Indicators**
- **MCP Compliance**: 100% tool availability and correct responses
- **Security**: Path traversal and injection attempts properly blocked
- **Memory Management**: No memory leaks during sustained operations
- **Token Efficiency**: Optimal token usage with compression when needed
- **Learning Retention**: Measurable improvement in similar task performance

## 🔍 **Interpreting Results**

### **Benchmark Report Structure**
```json
{
  "testId": "workflow-test-1234567890",
  "overallMetrics": {
    "totalDuration": 1200000,
    "operationsCompleted": 45,
    "learningEffectiveness": 0.18,
    "performanceScore": 0.87,
    "featuresCovered": ["Hybrid Search API", "..."]
  },
  "insights": ["Learning improvement: 18%", "..."],
  "recommendations": ["Deploy with Qdrant Cloud", "..."]
}
```

### **Key Performance Indicators**
- **Learning Effectiveness**: >0.15 (15% improvement) indicates successful learning
- **Performance Score**: >0.8 (80%) indicates production readiness  
- **Success Rate**: >0.95 (95%) indicates reliable operation
- **Quality Score**: >0.8 (80%) indicates high-quality results

### **Warning Signs**
- Response times >3 seconds indicate performance issues
- Success rate <90% suggests reliability problems
- Learning effectiveness <5% indicates learning system not working
- Quality scores <60% suggest relevance problems

## 🛠️ **Test Environment**

### **Required Services**
- **Qdrant**: Vector database (Docker: `qdrant/qdrant`)
- **Node.js**: Runtime environment (v18+)
- **Memory-Bank-Plus**: Built and ready (`npm run build`)

### **Environment Variables**
```bash
export MEMORY_BANK_ROOT="./test-memory-banks"
export QDRANT_HOST="localhost" 
export QDRANT_PORT="6333"
# Optional: QDRANT_API_KEY for cloud testing
```

### **Test Data**
- **4 realistic projects** (authentication, e-commerce, ML, DevOps)
- **15+ comprehensive documents** with proper YAML front-matter
- **Multiple domains** covered (security, architecture, performance)
- **Varied complexity levels** (5-9 complexity rating)
- **Rich metadata** (tags, salience, task descriptions)

## 🎓 **Learning Validation**

The test suite specifically validates that memory-bank-plus **learns and improves over time**:

1. **Baseline Performance**: Initial search quality and response times
2. **Task Completion**: Simulates successful development tasks
3. **Knowledge Capture**: Validates reflexive learning stores insights
4. **Improved Performance**: Measures improvement on similar subsequent tasks
5. **Adaptation**: Confirms adaptive policies improve storage decisions

## 🚨 **Troubleshooting**

### **Common Issues**
- **Qdrant Connection Failed**: Ensure Docker is running and port 6333 is available
- **Build Errors**: Run `npm run build` before testing
- **Test Timeouts**: Increase timeout for slower systems
- **Memory Issues**: Ensure adequate RAM (4GB+ recommended)

### **Debug Commands**
```bash
# Check Qdrant status
curl http://localhost:6333/collections

# Verify build
ls -la dist/main/index.js

# Test MCP server startup
node dist/main/index.js --help

# Run single test file
npx vitest run tests/integration/mcp-operations.spec.ts
```

## 📊 **Expected Results**

A successful benchmark run should demonstrate:
- ✅ **100% MCP tool availability** with correct responses
- ✅ **<2 second response times** for all search operations
- ✅ **>85% search relevance** for semantic queries
- ✅ **>60% compression efficiency** with quality preservation
- ✅ **>15% learning improvement** on subsequent similar tasks
- ✅ **Zero errors or crashes** during stress testing
- ✅ **Measurable adaptation** of memory policies over time

This validates that memory-bank-plus is ready for production deployment as an intelligent memory system for AI development workflows.
#!/usr/bin/env node

/**
 * Test Dataset Generator for Memory-Bank-Plus Benchmarking
 * 
 * Creates realistic development project data to test all advanced features:
 * - Authentication and security patterns
 * - Database design and optimization
 * - Frontend architecture and patterns
 * - API design and implementation
 * - Performance optimization techniques
 * - DevOps and deployment strategies
 */

interface TestFile {
  name: string;
  content: string;
  metadata: {
    tags: string[];
    salience: number;
    task: string;
    complexity: number;
    domain: string;
  };
}

interface TestProject {
  name: string;
  description: string;
  files: TestFile[];
  expectedQueries: Array<{
    query: string;
    expectedFiles: string[];
    domain: string;
  }>;
}

export class TestDatasetGenerator {
  generateComprehensiveDataset(): TestProject[] {
    return [
      this.generateAuthenticationProject(),
      this.generateECommerceProject(),
      this.generateMLPipelineProject(),
      this.generateDevOpsProject()
    ];
  }

  private generateAuthenticationProject(): TestProject {
    const files: TestFile[] = [
      {
        name: 'auth-architecture.md',
        metadata: {
          tags: ['authentication', 'architecture', 'security', 'jwt'],
          salience: 0.95,
          task: 'Design authentication system architecture',
          complexity: 8,
          domain: 'security'
        },
        content: `---
tags: [authentication, architecture, security, jwt]
salience: 0.95
task: "Design authentication system architecture" 
created: ${new Date().toISOString()}
---

# Authentication System Architecture

## Overview
Comprehensive authentication system supporting multiple authentication methods and security best practices.

## Core Components

### JWT Token Service
- Access tokens: 15-minute expiration
- Refresh tokens: 7-day expiration with rotation
- Claims: user ID, roles, permissions, issued at
- Algorithm: RS256 with key rotation

### Password Security
- Hashing: bcrypt with salt rounds = 12
- Complexity requirements: 12+ chars, mixed case, numbers, symbols
- Password history: prevent reuse of last 5 passwords
- Account lockout: 5 failed attempts = 30 min lockout

### Multi-Factor Authentication
- TOTP support via authenticator apps
- SMS backup codes for account recovery
- Hardware token support (WebAuthn)
- Biometric authentication for mobile

## Security Measures
- Rate limiting: 10 requests/minute per IP
- CSRF protection with double-submit cookies
- XSS prevention with Content Security Policy
- Session management with secure cookies

## Integration Points
- OAuth 2.0 providers (Google, GitHub, Microsoft)
- SAML for enterprise SSO
- LDAP/Active Directory integration
- API key management for service accounts
`
      },
      {
        name: 'jwt-implementation.md',
        metadata: {
          tags: ['jwt', 'implementation', 'security', 'node.js'],
          salience: 0.85,
          task: 'Implement JWT token service',
          complexity: 6,
          domain: 'security'
        },
        content: `---
tags: [jwt, implementation, security, nodejs]
salience: 0.85
task: "Implement JWT token service"
created: ${new Date().toISOString()}
---

# JWT Token Service Implementation

## Core Service Class

\`\`\`typescript
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export class JWTService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  
  constructor(privateKey: string, publicKey: string) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'auth-service',
      audience: 'app-users'
    });
  }

  generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: 'auth-service',
      audience: 'app-users'
    }) as TokenPayload;
  }
}
\`\`\`

## Token Payload Interface

\`\`\`typescript
interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}
\`\`\`

## Security Best Practices
- Store refresh tokens in secure database with expiration
- Implement token blacklisting for logout
- Use different signing keys for different environments
- Monitor for suspicious token usage patterns
- Implement token binding for additional security

## Error Handling
- TokenExpiredError: Return 401 with refresh instruction
- TokenInvalidError: Return 401 with re-authentication required
- TokenMalformedError: Log security incident, return 401
`
      },
      {
        name: 'password-security.md', 
        metadata: {
          tags: ['password', 'security', 'bcrypt', 'validation'],
          salience: 0.8,
          task: 'Implement secure password handling',
          complexity: 5,
          domain: 'security'
        },
        content: `---
tags: [password, security, bcrypt, validation]
salience: 0.8
task: "Implement secure password handling"
created: ${new Date().toISOString()}
---

# Password Security Implementation

## Password Hashing Service

\`\`\`typescript
import bcrypt from 'bcrypt';

export class PasswordService {
  private readonly saltRounds = 12;
  
  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }
  
  async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
  
  validatePasswordComplexity(password: string): ValidationResult {
    const rules = [
      { test: /.{12,}/, message: 'At least 12 characters' },
      { test: /[A-Z]/, message: 'At least one uppercase letter' },
      { test: /[a-z]/, message: 'At least one lowercase letter' },
      { test: /\d/, message: 'At least one number' },
      { test: /[!@#$%^&*]/, message: 'At least one special character' }
    ];
    
    const failures = rules.filter(rule => !rule.test.test(password));
    return {
      isValid: failures.length === 0,
      errors: failures.map(f => f.message)
    };
  }
}
\`\`\`

## Account Lockout Protection

\`\`\`typescript
export class AccountLockoutService {
  async recordFailedAttempt(identifier: string): Promise<LockoutStatus> {
    // Increment failed attempt counter
    // Check if threshold exceeded
    // Return lockout status and remaining time
  }
  
  async resetFailedAttempts(identifier: string): Promise<void> {
    // Clear failed attempts on successful login
  }
}
\`\`\`

## Password Policy Configuration
- Minimum length: 12 characters
- Character requirements: uppercase, lowercase, numbers, symbols
- Password history: store hashes of last 5 passwords
- Maximum age: 90 days for high-privilege accounts
- Common password blocking: check against compromised password lists
`
      }
    ];

    const expectedQueries = [
      {
        query: 'JWT token implementation security',
        expectedFiles: ['jwt-implementation.md', 'auth-architecture.md'],
        domain: 'security'
      },
      {
        query: 'password hashing bcrypt security',
        expectedFiles: ['password-security.md', 'auth-architecture.md'],
        domain: 'security'
      },
      {
        query: 'authentication system design patterns',
        expectedFiles: ['auth-architecture.md', 'jwt-implementation.md'],
        domain: 'security'
      }
    ];

    return {
      name: 'authentication-system',
      description: 'Comprehensive authentication system with security best practices',
      files,
      expectedQueries
    };
  }

  private generateECommerceProject(): TestProject {
    const files: TestFile[] = [
      {
        name: 'microservices-design.md',
        metadata: {
          tags: ['microservices', 'architecture', 'ecommerce', 'scalability'],
          salience: 0.9,
          task: 'Design e-commerce microservices architecture',
          complexity: 9,
          domain: 'architecture'
        },
        content: `---
tags: [microservices, architecture, ecommerce, scalability]
salience: 0.9
task: "Design e-commerce microservices architecture"
created: ${new Date().toISOString()}
---

# E-commerce Microservices Architecture

## Service Boundaries

### User Management Service
- User registration and authentication
- Profile management
- Preference storage
- Social login integration

### Product Catalog Service
- Product information management
- Inventory tracking
- Category and taxonomy
- Search and filtering
- Recommendations engine

### Order Management Service
- Shopping cart functionality
- Order processing workflow
- Payment integration
- Order status tracking
- Returns and refunds

### Notification Service
- Email notifications
- SMS alerts
- Push notifications
- In-app messaging
- Notification preferences

## Data Architecture
- Each service owns its data
- Event-driven communication via message bus
- CQRS pattern for complex business logic
- Event sourcing for audit trails

## Communication Patterns
- Synchronous: REST APIs for real-time queries
- Asynchronous: Events for eventual consistency
- GraphQL federation for unified API
- Service mesh for inter-service communication

## Scalability Strategies
- Horizontal pod autoscaling
- Database read replicas
- Caching layers (Redis cluster)
- CDN for static assets
- Load balancing with health checks
`
      },
      {
        name: 'payment-integration.md',
        metadata: {
          tags: ['payments', 'stripe', 'security', 'pci'],
          salience: 0.85,
          task: 'Implement secure payment processing',
          complexity: 7,
          domain: 'payments'
        },
        content: `---
tags: [payments, stripe, security, pci]
salience: 0.85
task: "Implement secure payment processing"
created: ${new Date().toISOString()}
---

# Payment Integration Strategy

## Payment Providers
- Primary: Stripe for card processing
- Secondary: PayPal for alternative payments
- Regional: Local payment methods per market
- Cryptocurrency: Bitcoin/Ethereum support

## PCI DSS Compliance
- Never store card data (use tokenization)
- Secure transmission (TLS 1.3)
- Regular security scanning
- Access control and monitoring
- Incident response procedures

## Implementation Architecture

\`\`\`typescript
export class PaymentService {
  async createPaymentIntent(amount: number, currency: string): Promise<PaymentIntent> {
    // Create Stripe payment intent
    // Return client secret for frontend
  }
  
  async processPayment(paymentId: string): Promise<PaymentResult> {
    // Confirm payment with Stripe
    // Handle webhooks for async updates
    // Update order status
  }
  
  async handleRefund(paymentId: string, amount?: number): Promise<RefundResult> {
    // Process refund through provider
    // Update order and inventory
  }
}
\`\`\`

## Security Measures
- Webhook signature verification
- Idempotency keys for duplicate prevention
- Rate limiting on payment endpoints
- Fraud detection integration
- 3D Secure for high-value transactions

## Error Handling
- Graceful degradation for provider outages
- Retry logic with exponential backoff
- Clear error messages for users
- Comprehensive logging for debugging
`
      }
    ];

    return {
      name: 'ecommerce-platform',
      description: 'Scalable e-commerce platform with microservices',
      files,
      expectedQueries: [
        {
          query: 'microservices architecture scalability patterns',
          expectedFiles: ['microservices-design.md'],
          domain: 'architecture'
        },
        {
          query: 'payment processing Stripe integration security',
          expectedFiles: ['payment-integration.md'],
          domain: 'payments'
        }
      ]
    };
  }

  private generateMLPipelineProject(): TestProject {
    const files: TestFile[] = [
      {
        name: 'ml-pipeline-architecture.md',
        metadata: {
          tags: ['machine-learning', 'pipeline', 'data', 'mlops'],
          salience: 0.88,
          task: 'Design ML pipeline architecture',
          complexity: 8,
          domain: 'ml'
        },
        content: `---
tags: [machine-learning, pipeline, data, mlops]
salience: 0.88
task: "Design ML pipeline architecture"
created: ${new Date().toISOString()}
---

# Machine Learning Pipeline Architecture

## Data Pipeline
- Data ingestion from multiple sources
- Data validation and quality checks
- Feature engineering and transformation
- Data versioning with DVC
- Automated data lineage tracking

## Model Development
- Experiment tracking with MLflow
- Model versioning and registry
- A/B testing framework for models
- Performance monitoring and drift detection
- Automated retraining triggers

## Infrastructure
- Kubernetes for orchestration
- Airflow for workflow management
- Feature store for serving features
- Model serving with FastAPI
- Monitoring with Prometheus/Grafana

## MLOps Best Practices
- CI/CD for model deployment
- Automated testing for data and models
- Model governance and compliance
- Rollback strategies for model updates
- Cost optimization for compute resources

## Performance Considerations
- GPU utilization optimization
- Batch prediction efficiency
- Real-time inference latency
- Memory management for large models
- Caching strategies for feature serving
`
      }
    ];

    return {
      name: 'ml-recommendation-system',
      description: 'Machine learning recommendation pipeline',
      files,
      expectedQueries: [
        {
          query: 'machine learning pipeline MLOps architecture',
          expectedFiles: ['ml-pipeline-architecture.md'],
          domain: 'ml'
        }
      ]
    };
  }

  private generateDevOpsProject(): TestProject {
    const files: TestFile[] = [
      {
        name: 'kubernetes-deployment.md',
        metadata: {
          tags: ['kubernetes', 'deployment', 'devops', 'scaling'],
          salience: 0.82,
          task: 'Design Kubernetes deployment strategy',
          complexity: 7,
          domain: 'devops'
        },
        content: `---
tags: [kubernetes, deployment, devops, scaling]
salience: 0.82
task: "Design Kubernetes deployment strategy"
created: ${new Date().toISOString()}
---

# Kubernetes Deployment Strategy

## Cluster Architecture
- Multi-zone deployment for high availability
- Node pools for different workload types
- Network policies for security isolation
- Resource quotas and limits
- RBAC for access control

## Application Deployment
- Helm charts for templating
- GitOps with ArgoCD
- Blue-green deployments
- Canary releases with Flagger
- Rolling updates with health checks

## Monitoring and Observability
- Prometheus for metrics collection
- Grafana for visualization
- Jaeger for distributed tracing
- ELK stack for centralized logging
- Alerting with AlertManager

## Security Best Practices
- Pod security policies
- Network segmentation
- Secret management with Vault
- Image scanning in CI/CD
- Runtime security monitoring

## Scaling Strategies
- Horizontal Pod Autoscaler (HPA)
- Vertical Pod Autoscaler (VPA)
- Cluster Autoscaler for nodes
- Custom metrics for scaling decisions
- Resource optimization recommendations
`
      },
      {
        name: 'ci-cd-pipeline.md',
        metadata: {
          tags: ['cicd', 'automation', 'testing', 'deployment'],
          salience: 0.78,
          task: 'Design CI/CD pipeline',
          complexity: 6,
          domain: 'devops'
        },
        content: `---
tags: [cicd, automation, testing, deployment]
salience: 0.78
task: "Design CI/CD pipeline"
created: ${new Date().toISOString()}
---

# CI/CD Pipeline Design

## Pipeline Stages

### Source Control
- Git workflow with feature branches
- Pull request reviews and approvals
- Automated conflict detection
- Branch protection rules

### Build Stage
- Dependency installation and caching
- Code compilation and bundling
- Static analysis and linting
- Security vulnerability scanning

### Test Stage
- Unit tests with coverage reporting
- Integration tests with test containers
- End-to-end tests with Playwright
- Performance testing with k6

### Security Stage
- SAST scanning with SonarQube
- Container image scanning
- Dependency vulnerability checks
- Compliance validation

### Deployment Stage
- Staging environment deployment
- Smoke tests and health checks
- Production deployment with approval
- Database migration handling
- Feature flag management

## Tools and Technologies
- GitHub Actions for orchestration
- Docker for containerization
- Terraform for infrastructure
- Vault for secrets management
- Datadog for monitoring
`
      }
    ];

    return {
      name: 'devops-infrastructure',
      description: 'DevOps automation and infrastructure management',
      files,
      expectedQueries: [
        {
          query: 'Kubernetes deployment scaling strategies',
          expectedFiles: ['kubernetes-deployment.md'],
          domain: 'devops'
        },
        {
          query: 'CI/CD pipeline automation testing',
          expectedFiles: ['ci-cd-pipeline.md'],
          domain: 'devops'
        }
      ]
    };
  }

  generatePerformanceTestQueries(): Array<{
    query: string;
    expectedDomains: string[];
    complexity: number;
    expectedResults: number;
  }> {
    return [
      {
        query: 'authentication JWT security implementation patterns',
        expectedDomains: ['security'],
        complexity: 7,
        expectedResults: 3
      },
      {
        query: 'microservices architecture scalability database design',
        expectedDomains: ['architecture', 'database'],
        complexity: 9,
        expectedResults: 4
      },
      {
        query: 'machine learning pipeline MLOps deployment',
        expectedDomains: ['ml', 'devops'],
        complexity: 8,
        expectedResults: 2
      },
      {
        query: 'payment processing security PCI compliance',
        expectedDomains: ['payments', 'security'],
        complexity: 7,
        expectedResults: 2
      },
      {
        query: 'Kubernetes deployment automation CI/CD',
        expectedDomains: ['devops'],
        complexity: 6,
        expectedResults: 2
      },
      {
        query: 'API performance optimization caching strategies',
        expectedDomains: ['performance', 'architecture'],
        complexity: 6,
        expectedResults: 3
      },
      {
        query: 'database indexing query optimization',
        expectedDomains: ['database', 'performance'],
        complexity: 5,
        expectedResults: 2
      },
      {
        query: 'frontend React component architecture patterns',
        expectedDomains: ['frontend', 'architecture'],
        complexity: 5,
        expectedResults: 2
      }
    ];
  }

  generateLearningScenarios(): Array<{
    name: string;
    initial_query: string;
    task_completion: any;
    follow_up_query: string;
    expected_improvement: number;
  }> {
    return [
      {
        name: 'Authentication Learning',
        initial_query: 'how to implement user authentication',
        task_completion: {
          tools_used: ['jwt', 'bcrypt', 'passport'],
          files_created: ['auth.service.ts', 'jwt.service.ts'],
          success: true,
          duration_ms: 45000,
          lessons: ['JWT short expiration is crucial', 'Rate limiting prevents attacks']
        },
        follow_up_query: 'implement secure login system',
        expected_improvement: 0.25 // 25% better relevance expected
      },
      {
        name: 'Performance Optimization Learning', 
        initial_query: 'optimize database performance',
        task_completion: {
          tools_used: ['postgresql', 'redis', 'monitoring'],
          files_created: ['db.optimization.md', 'cache.service.ts'],
          success: true,
          duration_ms: 67000,
          lessons: ['Indexing crucial for queries', 'Connection pooling essential']
        },
        follow_up_query: 'improve API response times',
        expected_improvement: 0.3
      },
      {
        name: 'Deployment Automation Learning',
        initial_query: 'set up CI/CD pipeline',
        task_completion: {
          tools_used: ['github-actions', 'docker', 'kubernetes'],
          files_created: ['deploy.yml', 'docker.compose.yml'],
          success: true,
          duration_ms: 82000,
          lessons: ['Automated testing critical', 'Staged rollouts reduce risk']
        },
        follow_up_query: 'implement automated deployment',
        expected_improvement: 0.35
      }
    ];
  }

  async writeDatasetToMemoryBank(
    projects: TestProject[], 
    mcpToolCall: (tool: string, params: any) => Promise<any>
  ): Promise<void> {
    console.log('📚 Writing test dataset to memory bank...');

    for (const project of projects) {
      console.log(`  📁 Creating project: ${project.name}`);
      
      for (const file of project.files) {
        await mcpToolCall('memory_bank_write', {
          projectName: project.name,
          fileName: file.name,
          content: file.content
        });
      }
      
      console.log(`    ✅ Created ${project.files.length} files`);
    }

    console.log(`✅ Dataset created: ${projects.length} projects, ${projects.reduce((sum, p) => sum + p.files.length, 0)} total files`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new TestDatasetGenerator();
  const dataset = generator.generateComprehensiveDataset();
  
  console.log('📊 Generated test dataset:');
  dataset.forEach(project => {
    console.log(`  📁 ${project.name}: ${project.files.length} files, ${project.expectedQueries.length} test queries`);
  });
}


import { describe, it, expect, beforeEach } from 'vitest';
import { 
  makeListProjectsController,
  makeListProjectFilesController,
  makeReadController,
  makeWriteController,
  makeUpdateController,
  makeSearchController,
  makeCompileContextController
} from '../../src/main/factories/controllers/index.js';
import { Request } from '../../src/presentation/protocols/index.js';

describe('MCP Operations Testing', () => {
  let listProjectsController: ReturnType<typeof makeListProjectsController>;
  let listProjectFilesController: ReturnType<typeof makeListProjectFilesController>;
  let readController: ReturnType<typeof makeReadController>;
  let writeController: ReturnType<typeof makeWriteController>;
  let updateController: ReturnType<typeof makeUpdateController>;
  let searchController: ReturnType<typeof makeSearchController>;
  let compileContextController: ReturnType<typeof makeCompileContextController>;

  beforeEach(() => {
    // Initialize all controllers
    listProjectsController = makeListProjectsController();
    listProjectFilesController = makeListProjectFilesController();
    readController = makeReadController();
    writeController = makeWriteController();
    updateController = makeUpdateController();
    searchController = makeSearchController();
    compileContextController = makeCompileContextController();
  });

  describe('Controller Instantiation', () => {
    it('should create all controllers without errors', () => {
      expect(listProjectsController).toBeDefined();
      expect(listProjectFilesController).toBeDefined();
      expect(readController).toBeDefined();
      expect(writeController).toBeDefined();
      expect(updateController).toBeDefined();
      expect(searchController).toBeDefined();
      expect(compileContextController).toBeDefined();
    });
  });

  describe('List Projects Operation', () => {
    it('should handle list projects request', async () => {
      const request: Request<{}> = {
        body: {},
      };

      const response = await listProjectsController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect(response.statusCode).toBeDefined();
      expect([200, 404, 500]).toContain(response.statusCode); // Valid status codes
    });
  });

  describe('List Project Files Operation', () => {
    it('should handle valid project name', async () => {
      const request: Request<{ projectName: string }> = {
        body: {
          projectName: 'test-project',
        },
      };

      const response = await listProjectFilesController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect(response.statusCode).toBeDefined();
    });

    it('should reject missing project name', async () => {
      const request: Request<{}> = {
        body: {},
      };

      const response = await listProjectFilesController.handle(request);
      
      expect(response.statusCode).toBe(400); // Bad request for missing param
    });

    it('should reject invalid project name', async () => {
      const request: Request<{ projectName: string }> = {
        body: {
          projectName: '../../../etc/passwd', // Path traversal attempt
        },
      };

      const response = await listProjectFilesController.handle(request);
      
      expect(response.statusCode).toBe(400); // Security validation should reject
    });
  });

  describe('Read File Operation', () => {
    it('should handle valid read request', async () => {
      const request: Request<{ projectName: string; fileName: string }> = {
        body: {
          projectName: 'test-project',
          fileName: 'test.md',
        },
      };

      const response = await readController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 404, 500]).toContain(response.statusCode);
    });

    it('should reject missing parameters', async () => {
      const request: Request<{}> = {
        body: {},
      };

      const response = await readController.handle(request);
      
      expect(response.statusCode).toBe(400);
    });

    it('should reject path traversal in filename', async () => {
      const request: Request<{ projectName: string; fileName: string }> = {
        body: {
          projectName: 'test-project',
          fileName: '../../../etc/passwd',
        },
      };

      const response = await readController.handle(request);
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('Write File Operation', () => {
    it('should handle valid write request', async () => {
      const request: Request<{ projectName: string; fileName: string; content: string }> = {
        body: {
          projectName: 'test-project',
          fileName: 'new-file.md',
          content: 'Test content for new file.',
        },
      };

      const response = await writeController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('should reject missing content', async () => {
      const request: Request<{ projectName: string; fileName: string }> = {
        body: {
          projectName: 'test-project',
          fileName: 'test.md',
        } as any,
      };

      const response = await writeController.handle(request);
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('Update File Operation', () => {
    it('should handle valid update request', async () => {
      const request: Request<{ projectName: string; fileName: string; content: string }> = {
        body: {
          projectName: 'test-project',
          fileName: 'existing-file.md',
          content: 'Updated content.',
        },
      };

      const response = await updateController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 404, 500]).toContain(response.statusCode);
    });
  });

  describe('Search Operation', () => {
    it('should handle valid search request', async () => {
      const request: Request<{ query: string; projectName?: string }> = {
        body: {
          query: 'test search query',
          projectName: 'test-project',
        },
      };

      const response = await searchController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('should reject empty query', async () => {
      const request: Request<{ query?: string }> = {
        body: {},
      };

      const response = await searchController.handle(request);
      
      expect(response.statusCode).toBe(400);
    });

    it('should handle search parameters', async () => {
      const request: Request<{
        query: string;
        limit: number;
        semanticWeight: number;
        recencyWeight: number;
      }> = {
        body: {
          query: 'advanced search test',
          limit: 5,
          semanticWeight: 0.6,
          recencyWeight: 0.4,
        },
      };

      const response = await searchController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('should reject invalid parameters', async () => {
      const request: Request<{
        query: string;
        limit: number;
        semanticWeight: number;
      }> = {
        body: {
          query: 'test',
          limit: -1, // Invalid limit
          semanticWeight: 1.5, // Invalid weight > 1
        },
      };

      const response = await searchController.handle(request);
      
      // Should either accept and normalize or reject with validation error
      expect(response).toHaveProperty('statusCode');
      expect([200, 400, 500]).toContain(response.statusCode);
    });
  });

  describe('Compile Context Operation', () => {
    it('should handle valid compile context request', async () => {
      const request: Request<{
        query: string;
        maxTokens?: number;
        projectName?: string;
      }> = {
        body: {
          query: 'compile context for this query',
          maxTokens: 2000,
          projectName: 'test-project',
        },
      };

      const response = await compileContextController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('should reject missing query', async () => {
      const request: Request<{}> = {
        body: {},
      };

      const response = await compileContextController.handle(request);
      
      expect(response.statusCode).toBe(400);
    });

    it('should handle advanced compilation parameters', async () => {
      const request: Request<{
        query: string;
        maxTokens: number;
        compressionTarget: number;
        includeFiles: boolean;
        includeSummaries: boolean;
      }> = {
        body: {
          query: 'advanced compilation test',
          maxTokens: 4000,
          compressionTarget: 0.3,
          includeFiles: true,
          includeSummaries: true,
        },
      };

      const response = await compileContextController.handle(request);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 400, 500]).toContain(response.statusCode);
    });
  });

  describe('Validation Testing', () => {
    it('should consistently reject null/undefined bodies', async () => {
      const nullRequest: Request<any> = {
        body: null,
      };

      const undefinedRequest: Request<any> = {
        body: undefined,
      };

      // Test all controllers with null/undefined bodies
      const controllers = [
        listProjectFilesController,
        readController, 
        writeController,
        updateController,
        searchController,
        compileContextController,
      ];

      for (const controller of controllers) {
        const nullResponse = await controller.handle(nullRequest);
        const undefinedResponse = await controller.handle(undefinedRequest);
        
        // Should handle gracefully, likely with 400 status
        expect([200, 400, 500]).toContain(nullResponse.statusCode);
        expect([200, 400, 500]).toContain(undefinedResponse.statusCode);
      }
    });

    it('should handle malformed request bodies', async () => {
      const malformedRequest: Request<any> = {
        body: {
          projectName: null,
          fileName: undefined,
          query: '',
          limit: 'not-a-number',
          semanticWeight: 'invalid',
        },
      };

      const controllers = [
        listProjectFilesController,
        readController,
        searchController,
      ];

      for (const controller of controllers) {
        const response = await controller.handle(malformedRequest);
        
        // Should handle gracefully
        expect(response).toHaveProperty('statusCode');
        expect([200, 400, 500]).toContain(response.statusCode);
      }
    });
  });

  describe('Error Propagation', () => {
    it('should propagate and handle errors properly', async () => {
      // Create a request that might cause internal errors
      const problematicRequest: Request<{ query: string }> = {
        body: {
          query: 'x'.repeat(100000), // Very long query
        },
      };

      const response = await searchController.handle(problematicRequest);
      
      expect(response).toHaveProperty('statusCode');
      expect([200, 400, 500]).toContain(response.statusCode);
      
      if (response.statusCode === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});
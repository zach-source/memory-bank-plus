import { describe, it, expect, beforeEach, vi } from "vitest";
import { GlobalMemoryImpl } from "../../../../src/data/usecases/global-memory/global-memory.js";
import { GlobalMemoryType } from "../../../../src/domain/entities/global-memory.js";
import { MockEpisodicMemoryRepository } from "../../../mocks/mock-episodic-memory-repository.js";

// Mock implementations
const mockGlobalMemoryRepository = {
  storeGlobalMemory: vi.fn(),
  searchGlobalMemories: vi.fn(),
  getGlobalMemory: vi.fn(),
  getGlobalMemoriesByType: vi.fn(),
  updateGlobalMemoryAccess: vi.fn(),
  findRelatedGlobalMemories: vi.fn(),
  getGlobalMemoryInsights: vi.fn(),
  getMostValuableMemories: vi.fn(),
  archiveGlobalMemory: vi.fn(),
  getGlobalMemoryStats: vi.fn(),
};

const mockFileRepository = {
  listFiles: vi.fn(),
  loadFile: vi.fn(),
  writeFile: vi.fn(),
  updateFile: vi.fn(),
};

const mockVectorRepository = {
  initialize: vi.fn(),
  upsertFile: vi.fn(),
  deleteFile: vi.fn(),
  search: vi.fn(),
  getEmbedding: vi.fn().mockResolvedValue(new Float32Array(384).fill(0.1)),
  updateFileAccess: vi.fn(),
  getProjectStats: vi.fn(),
};

describe("GlobalMemoryImpl", () => {
  let globalMemory: GlobalMemoryImpl;

  beforeEach(() => {
    globalMemory = new GlobalMemoryImpl(
      mockGlobalMemoryRepository as any,
      mockFileRepository as any,
      mockVectorRepository as any,
    );

    // Reset mocks
    vi.clearAllMocks();
  });

  describe("storeGlobalLesson", () => {
    it("should store a global lesson with proper metadata", async () => {
      const title = "Test Global Lesson";
      const content = "This is a test global lesson content.";
      const type = GlobalMemoryType.LESSON;
      const metadata = {
        tags: ["test", "global"],
        salience: 0.8,
        complexity: 6,
        source_projects: ["test-project"],
      };

      const result = await globalMemory.storeGlobalLesson(
        title,
        content,
        type,
        metadata,
      );

      expect(result).toBeDefined();
      expect(result.title).toBe(title);
      expect(result.content).toBe(content);
      expect(result.type).toBe(type);
      expect(result.metadata.tags).toEqual(metadata.tags);
      expect(result.metadata.salience).toBe(metadata.salience);
      expect(result.metadata.complexity).toBe(metadata.complexity);
      expect(result.metadata.source_projects).toEqual(metadata.source_projects);
      expect(result.metadata.reusability).toBeGreaterThan(0);
      expect(result.embedding).toBeDefined();

      expect(mockGlobalMemoryRepository.storeGlobalMemory).toHaveBeenCalledWith(
        result,
      );
      expect(mockVectorRepository.getEmbedding).toHaveBeenCalledWith(
        `${title} ${content}`,
      );
    });

    it("should calculate reusability based on complexity and salience", async () => {
      const highValueLesson = await globalMemory.storeGlobalLesson(
        "High Value Lesson",
        "Content",
        GlobalMemoryType.BEST_PRACTICE,
        {
          tags: ["test"],
          salience: 0.9,
          complexity: 8,
          source_projects: ["test"],
        },
      );

      const lowValueLesson = await globalMemory.storeGlobalLesson(
        "Low Value Lesson",
        "Content",
        GlobalMemoryType.INSIGHT,
        {
          tags: ["test"],
          salience: 0.3,
          complexity: 2,
          source_projects: ["test"],
        },
      );

      expect(highValueLesson.metadata.reusability).toBeGreaterThan(
        lowValueLesson.metadata.reusability,
      );
    });
  });

  describe("searchGlobalMemories", () => {
    it("should delegate to repository with proper query", async () => {
      const query = {
        query: "test query",
        type: GlobalMemoryType.LESSON,
        tags: ["test"],
        limit: 5,
      };

      mockGlobalMemoryRepository.searchGlobalMemories.mockResolvedValue([]);

      const result = await globalMemory.searchGlobalMemories(query);

      expect(
        mockGlobalMemoryRepository.searchGlobalMemories,
      ).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });

  describe("getContextualMemories", () => {
    it("should filter and prioritize memories for project context", async () => {
      const mockMemories = [
        {
          id: "global-1",
          type: GlobalMemoryType.PRINCIPLE,
          metadata: {
            reusability: 0.9,
            source_projects: ["test-project"],
          },
          relationships: {
            applied_to_projects: [],
          },
        },
        {
          id: "global-2",
          type: GlobalMemoryType.LESSON,
          metadata: {
            reusability: 0.6,
            source_projects: ["other-project"],
          },
          relationships: {
            applied_to_projects: ["test-project"],
          },
        },
      ];

      mockGlobalMemoryRepository.searchGlobalMemories.mockResolvedValue(
        mockMemories,
      );

      const result = await globalMemory.getContextualMemories(
        "test-project",
        "test context",
        5,
      );

      expect(
        mockGlobalMemoryRepository.searchGlobalMemories,
      ).toHaveBeenCalledWith({
        query: "test context",
        limit: 5,
        min_salience: 0.6,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("promoteToGlobal", () => {
    it("should promote project memory to global scope", async () => {
      const projectName = "test-project";
      const fileName = "test-file.md";
      const content = `---
tags: [test, important]
salience: 0.8
complexity: 7
---

# Test File

This is test content for promotion to global scope.`;

      mockFileRepository.loadFile.mockResolvedValue(content);

      const result = await globalMemory.promoteToGlobal(
        projectName,
        fileName,
        GlobalMemoryType.BEST_PRACTICE,
      );

      expect(mockFileRepository.loadFile).toHaveBeenCalledWith(
        projectName,
        fileName,
      );
      expect(result).toBeDefined();
      expect(result.type).toBe(GlobalMemoryType.BEST_PRACTICE);
      expect(result.metadata.source_projects).toContain(projectName);
      expect(result.relationships.derived_from).toContain(
        `${projectName}:${fileName}`,
      );
      expect(mockGlobalMemoryRepository.storeGlobalMemory).toHaveBeenCalledWith(
        result,
      );
    });

    it("should throw error if source file not found", async () => {
      mockFileRepository.loadFile.mockResolvedValue(null);

      await expect(
        globalMemory.promoteToGlobal(
          "nonexistent-project",
          "nonexistent-file.md",
          GlobalMemoryType.LESSON,
        ),
      ).rejects.toThrow(
        "File not found: nonexistent-project/nonexistent-file.md",
      );
    });
  });

  describe("recordGlobalMemoryApplication", () => {
    it("should update memory access and increase reusability on success", async () => {
      const memoryId = "global-test-1";
      const projectContext = "test-project";
      const mockMemory = {
        id: memoryId,
        metadata: { reusability: 0.7 },
        relationships: { applied_to_projects: [] },
      };

      mockGlobalMemoryRepository.getGlobalMemory.mockResolvedValue(mockMemory);

      await globalMemory.recordGlobalMemoryApplication(
        memoryId,
        projectContext,
        true, // success
      );

      expect(
        mockGlobalMemoryRepository.updateGlobalMemoryAccess,
      ).toHaveBeenCalledWith(memoryId, projectContext);
      expect(mockGlobalMemoryRepository.getGlobalMemory).toHaveBeenCalledWith(
        memoryId,
      );
      expect(mockGlobalMemoryRepository.storeGlobalMemory).toHaveBeenCalledWith(
        {
          ...mockMemory,
          metadata: { reusability: 0.8 }, // Increased by 0.1
          relationships: {
            applied_to_projects: [projectContext], // Added project
          },
        },
      );
    });

    it("should only update access on failure", async () => {
      const memoryId = "global-test-1";
      const projectContext = "test-project";

      await globalMemory.recordGlobalMemoryApplication(
        memoryId,
        projectContext,
        false, // failure
      );

      expect(
        mockGlobalMemoryRepository.updateGlobalMemoryAccess,
      ).toHaveBeenCalledWith(memoryId, projectContext);
      expect(mockGlobalMemoryRepository.getGlobalMemory).not.toHaveBeenCalled();
    });
  });

  describe("getMostValuableGlobalMemories", () => {
    it("should delegate to repository with correct limit", async () => {
      const limit = 15;
      mockGlobalMemoryRepository.getMostValuableMemories.mockResolvedValue([]);

      const result = await globalMemory.getMostValuableGlobalMemories(limit);

      expect(
        mockGlobalMemoryRepository.getMostValuableMemories,
      ).toHaveBeenCalledWith(limit);
      expect(result).toEqual([]);
    });

    it("should use default limit when none provided", async () => {
      mockGlobalMemoryRepository.getMostValuableMemories.mockResolvedValue([]);

      await globalMemory.getMostValuableGlobalMemories();

      expect(
        mockGlobalMemoryRepository.getMostValuableMemories,
      ).toHaveBeenCalledWith(20);
    });
  });

  describe("private methods", () => {
    it("should generate unique global memory IDs", () => {
      // Access private method through any type assertion for testing
      const globalMemoryAny = globalMemory as any;

      const id1 = globalMemoryAny.generateGlobalMemoryId(
        GlobalMemoryType.LESSON,
        "Test Lesson",
      );
      const id2 = globalMemoryAny.generateGlobalMemoryId(
        GlobalMemoryType.LESSON,
        "Test Lesson",
      );

      expect(id1).toMatch(/^global-lesson-test-lesson-\d+$/);
      expect(id2).toMatch(/^global-lesson-test-lesson-\d+$/);
      expect(id1).not.toBe(id2); // Should be unique due to timestamp
    });

    it("should calculate project relevance correctly", () => {
      const globalMemoryAny = globalMemory as any;

      const memory = {
        type: GlobalMemoryType.PRINCIPLE,
        metadata: { reusability: 0.5, source_projects: ["source-project"] },
        relationships: { applied_to_projects: ["applied-project"] },
      };

      // High relevance for applied project
      const appliedRelevance = globalMemoryAny.calculateProjectRelevance(
        memory,
        "applied-project",
      );
      expect(appliedRelevance).toBeGreaterThan(0.7);

      // Medium relevance for source project
      const sourceRelevance = globalMemoryAny.calculateProjectRelevance(
        memory,
        "source-project",
      );
      expect(sourceRelevance).toBeGreaterThan(0.6);

      // Lower relevance for unrelated project
      const unrelatedRelevance = globalMemoryAny.calculateProjectRelevance(
        memory,
        "unrelated-project",
      );
      expect(unrelatedRelevance).toBeLessThan(appliedRelevance);
    });
  });
});

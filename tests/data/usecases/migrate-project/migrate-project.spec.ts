import { describe, it, expect, beforeEach, vi } from "vitest";
import { MigrateProject } from "../../../../src/data/usecases/migrate-project/migrate-project.js";

// Mock repositories
const mockFileRepository = {
  listFiles: vi.fn(),
  loadFile: vi.fn(),
  writeFile: vi.fn(),
  updateFile: vi.fn(),
};

const mockProjectRepository = {
  listProjects: vi.fn(),
  projectExists: vi.fn(),
  ensureProject: vi.fn(),
};

describe("MigrateProject", () => {
  let migrateProject: MigrateProject;

  beforeEach(() => {
    migrateProject = new MigrateProject(
      mockFileRepository as any,
      mockProjectRepository as any,
    );

    // Reset mocks
    vi.clearAllMocks();
  });

  describe("migrateProject", () => {
    it("should successfully migrate project with all files", async () => {
      const oldProjectName = "old-project";
      const newProjectName = "new-project";
      const testFiles = ["file1.md", "file2.md"];
      const fileContent = "Test file content";

      // Setup mocks
      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true) // Source exists
        .mockResolvedValueOnce(false); // Target doesn't exist
      mockFileRepository.listFiles.mockResolvedValue(testFiles);
      mockFileRepository.loadFile.mockResolvedValue(fileContent);
      mockFileRepository.writeFile.mockResolvedValue(fileContent);

      const result = await migrateProject.migrateProject(
        oldProjectName,
        newProjectName,
      );

      expect(result.success).toBe(true);
      expect(result.oldProjectName).toBe(oldProjectName);
      expect(result.newProjectName).toBe(newProjectName);
      expect(result.filesProcessed).toBe(testFiles.length);
      expect(result.errorMessages).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);

      // Verify repository calls
      expect(mockProjectRepository.projectExists).toHaveBeenCalledWith(
        oldProjectName,
      );
      expect(mockProjectRepository.projectExists).toHaveBeenCalledWith(
        newProjectName,
      );
      expect(mockProjectRepository.ensureProject).toHaveBeenCalledWith(
        newProjectName,
      );
      expect(mockFileRepository.listFiles).toHaveBeenCalledWith(oldProjectName);

      for (const fileName of testFiles) {
        expect(mockFileRepository.loadFile).toHaveBeenCalledWith(
          oldProjectName,
          fileName,
        );
        expect(mockFileRepository.writeFile).toHaveBeenCalledWith(
          newProjectName,
          fileName,
          fileContent,
        );
      }
    });

    it("should fail when source project doesn't exist", async () => {
      mockProjectRepository.projectExists.mockResolvedValue(false);

      const result = await migrateProject.migrateProject(
        "nonexistent-project",
        "new-project",
      );

      expect(result.success).toBe(false);
      expect(result.errorMessages).toContain(
        'Source project "nonexistent-project" does not exist',
      );
      expect(result.filesProcessed).toBe(0);
    });

    it("should fail when target project already exists", async () => {
      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true) // Source exists
        .mockResolvedValueOnce(true); // Target also exists

      const result = await migrateProject.migrateProject(
        "existing-source",
        "existing-target",
      );

      expect(result.success).toBe(false);
      expect(result.errorMessages).toContain(
        'Target project "existing-target" already exists',
      );
    });

    it("should allow overwriting target when validation disabled", async () => {
      mockProjectRepository.projectExists.mockResolvedValue(true);
      mockFileRepository.listFiles.mockResolvedValue(["test.md"]);
      mockFileRepository.loadFile.mockResolvedValue("content");
      mockFileRepository.writeFile.mockResolvedValue("content");

      const result = await migrateProject.migrateProject(
        "source-project",
        "existing-target",
        { validateTarget: false },
      );

      expect(result.success).toBe(true);
      expect(result.errorMessages).toHaveLength(0);
    });

    it("should update project references in content", async () => {
      const oldProjectName = "old-project";
      const newProjectName = "new-project";
      const contentWithReferences = `---
project: "old-project"
---

# Documentation

See [other file](old-project/other.md) for details.
Path reference: old-project/assets/`;

      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockFileRepository.listFiles.mockResolvedValue(["test.md"]);
      mockFileRepository.loadFile.mockResolvedValue(contentWithReferences);
      mockFileRepository.writeFile.mockImplementation((proj, file, content) => {
        // Verify content was updated
        expect(content).toContain(`project: "${newProjectName}"`);
        expect(content).toContain(`[other file](${newProjectName}/other.md)`);
        expect(content).toContain(`${newProjectName}/assets/`);
        return Promise.resolve(content);
      });

      const result = await migrateProject.migrateProject(
        oldProjectName,
        newProjectName,
        { updateReferences: true },
      );

      expect(result.success).toBe(true);
      expect(mockFileRepository.writeFile).toHaveBeenCalled();
    });

    it("should not update references when disabled", async () => {
      const originalContent = "project: old-project";

      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockFileRepository.listFiles.mockResolvedValue(["test.md"]);
      mockFileRepository.loadFile.mockResolvedValue(originalContent);
      mockFileRepository.writeFile.mockImplementation((proj, file, content) => {
        expect(content).toBe(originalContent); // Unchanged
        return Promise.resolve(content);
      });

      const result = await migrateProject.migrateProject(
        "old-project",
        "new-project",
        { updateReferences: false },
      );

      expect(result.success).toBe(true);
    });

    it("should handle file load errors gracefully", async () => {
      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockFileRepository.listFiles.mockResolvedValue(["file1.md", "file2.md"]);
      mockFileRepository.loadFile
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce(null); // Second file fails to load
      mockFileRepository.writeFile.mockResolvedValue("content1");

      const result = await migrateProject.migrateProject("source", "target");

      expect(result.success).toBe(true); // Still successful
      expect(result.filesProcessed).toBe(1); // Only first file processed
      expect(result.warnings).toContain("Could not load file: file2.md");
    });

    it("should handle write errors", async () => {
      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockFileRepository.listFiles.mockResolvedValue(["test.md"]);
      mockFileRepository.loadFile.mockResolvedValue("content");
      mockFileRepository.writeFile.mockResolvedValue(null); // Write fails

      const result = await migrateProject.migrateProject("source", "target");

      expect(result.success).toBe(false);
      expect(result.errorMessages).toContain(
        "Failed to write file to target: test.md",
      );
      expect(result.filesProcessed).toBe(0);
    });
  });

  describe("batchMigrateProjects", () => {
    it("should migrate multiple projects successfully", async () => {
      mockProjectRepository.projectExists.mockResolvedValue(true);
      mockFileRepository.listFiles.mockResolvedValue(["test.md"]);
      mockFileRepository.loadFile.mockResolvedValue("content");
      mockFileRepository.writeFile.mockResolvedValue("content");

      const migrations = [
        { oldName: "project1", newName: "new-project1" },
        { oldName: "project2", newName: "new-project2" },
      ];

      const results = await migrateProject.batchMigrateProjects(migrations);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should stop on first failure by default", async () => {
      mockProjectRepository.projectExists
        .mockResolvedValueOnce(false) // First migration fails
        .mockResolvedValue(true); // Would succeed if reached

      const migrations = [
        { oldName: "nonexistent", newName: "target1" },
        { oldName: "existing", newName: "target2" },
      ];

      const results = await migrateProject.batchMigrateProjects(migrations);

      expect(results).toHaveLength(1); // Stopped after first failure
      expect(results[0].success).toBe(false);
    });
  });

  describe("validateMigrationPlan", () => {
    it("should validate successful migration plan", async () => {
      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true) // Source exists
        .mockResolvedValueOnce(false); // Target doesn't exist
      mockFileRepository.listFiles.mockResolvedValue(["file1.md", "file2.md"]);

      const result = await migrateProject.validateMigrationPlan(
        "source-project",
        "target-project",
      );

      expect(result.canMigrate).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toBeDefined();
    });

    it("should identify issues with migration plan", async () => {
      mockProjectRepository.projectExists.mockResolvedValue(false); // Source doesn't exist

      const result = await migrateProject.validateMigrationPlan(
        "nonexistent-source",
        "target-project",
      );

      expect(result.canMigrate).toBe(false);
      expect(result.issues).toContain(
        'Source project "nonexistent-source" does not exist',
      );
    });

    it("should provide recommendations for large projects", async () => {
      mockProjectRepository.projectExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      // Mock large project (>100 files)
      const largeFileList = Array.from(
        { length: 150 },
        (_, i) => `file${i}.md`,
      );
      mockFileRepository.listFiles.mockResolvedValue(largeFileList);

      const result = await migrateProject.validateMigrationPlan(
        "large-project",
        "target-project",
      );

      expect(result.canMigrate).toBe(true);
      expect(
        result.recommendations.some((rec) => rec.includes("Large project")),
      ).toBe(true);
    });

    it("should detect circular reference issues", async () => {
      const result1 = await migrateProject.validateMigrationPlan(
        "/parent/project",
        "/parent/project/child",
      );

      const result2 = await migrateProject.validateMigrationPlan(
        "/parent/project/child",
        "/parent/project",
      );

      expect(result1.canMigrate).toBe(false);
      expect(result2.canMigrate).toBe(false);
      expect(
        result1.issues.some((issue) => issue.includes("nested paths")),
      ).toBe(true);
    });
  });

  describe("content reference updating", () => {
    it("should update YAML front-matter references", () => {
      const migrateProjectAny = migrateProject as any;
      const content = `---
project: "old-project"
related: ["old-project", "other"]
---
Content here`;

      const updated = migrateProjectAny.updateProjectReferences(
        content,
        "old-project",
        "new-project",
      );

      expect(updated).toContain(`project: "new-project"`);
    });

    it("should update markdown links", () => {
      const migrateProjectAny = migrateProject as any;
      const content = `See [documentation](old-project/docs.md) and [guide](old-project/guide.md).`;

      const updated = migrateProjectAny.updateProjectReferences(
        content,
        "old-project",
        "new-project",
      );

      expect(updated).toContain("[documentation](new-project/docs.md)");
      expect(updated).toContain("[guide](new-project/guide.md)");
    });

    it("should update file path references", () => {
      const migrateProjectAny = migrateProject as any;
      const content = `File is located at old-project/src/file.ts`;

      const updated = migrateProjectAny.updateProjectReferences(
        content,
        "old-project",
        "new-project",
      );

      expect(updated).toContain("new-project/src/file.ts");
    });

    it("should escape regex special characters", () => {
      const migrateProjectAny = migrateProject as any;
      const escaped = migrateProjectAny.escapeRegExp("project+name*test?");

      expect(escaped).toBe("project\\+name\\*test\\?");
    });
  });

  describe("path validation", () => {
    it("should detect sub-path relationships", () => {
      const migrateProjectAny = migrateProject as any;

      expect(migrateProjectAny.isSubPath("/parent", "/parent/child")).toBe(
        true,
      );
      expect(migrateProjectAny.isSubPath("/parent/child", "/parent")).toBe(
        false,
      );
      expect(migrateProjectAny.isSubPath("/parent", "/parent")).toBe(true);
      expect(migrateProjectAny.isSubPath("/unrelated", "/other")).toBe(false);
    });

    it("should handle Windows paths correctly", () => {
      const migrateProjectAny = migrateProject as any;

      expect(
        migrateProjectAny.isSubPath("C:\\parent", "C:\\parent\\child"),
      ).toBe(true);
      expect(
        migrateProjectAny.isSubPath("c:\\parent", "C:\\PARENT\\CHILD"),
      ).toBe(true);
    });
  });
});

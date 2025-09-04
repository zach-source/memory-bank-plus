import { FileRepository, ProjectRepository } from "../../protocols/index.js";

export interface ProjectMigrationOptions {
  copyFiles?: boolean; // Copy files instead of moving (default: false)
  preserveOriginal?: boolean; // Keep original project after migration (default: false)
  updateReferences?: boolean; // Update cross-project references (default: true)
  validateTarget?: boolean; // Validate target path doesn't exist (default: true)
}

export interface MigrationResult {
  success: boolean;
  oldProjectName: string;
  newProjectName: string;
  filesProcessed: number;
  errorMessages: string[];
  warnings: string[];
  duration: number;
}

export class MigrateProject {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async migrateProject(
    oldProjectName: string,
    newProjectName: string,
    options: ProjectMigrationOptions = {},
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      oldProjectName,
      newProjectName,
      filesProcessed: 0,
      errorMessages: [],
      warnings: [],
      duration: 0,
    };

    try {
      // Validate source project exists
      const sourceExists =
        await this.projectRepository.projectExists(oldProjectName);
      if (!sourceExists) {
        result.errorMessages.push(
          `Source project "${oldProjectName}" does not exist`,
        );
        return this.finalizeResult(result, startTime);
      }

      // Validate target project doesn't exist (if validation enabled)
      if (options.validateTarget !== false) {
        const targetExists =
          await this.projectRepository.projectExists(newProjectName);
        if (targetExists) {
          result.errorMessages.push(
            `Target project "${newProjectName}" already exists`,
          );
          return this.finalizeResult(result, startTime);
        }
      }

      // Get all files in source project
      const files = await this.fileRepository.listFiles(oldProjectName);
      if (files.length === 0) {
        result.warnings.push("No files found in source project");
      }

      // Ensure target project directory exists
      await this.projectRepository.ensureProject(newProjectName);

      // Process each file
      for (const fileName of files) {
        try {
          const content = await this.fileRepository.loadFile(
            oldProjectName,
            fileName,
          );
          if (content === null) {
            result.warnings.push(`Could not load file: ${fileName}`);
            continue;
          }

          // Update content if it contains references to the old project name
          const updatedContent =
            options.updateReferences !== false
              ? this.updateProjectReferences(
                  content,
                  oldProjectName,
                  newProjectName,
                )
              : content;

          // Write to new project
          const writeResult = await this.fileRepository.writeFile(
            newProjectName,
            fileName,
            updatedContent,
          );

          if (writeResult === null) {
            result.errorMessages.push(
              `Failed to write file to target: ${fileName}`,
            );
            continue;
          }

          result.filesProcessed++;

          // Remove from original project if moving (not copying)
          if (!options.copyFiles && !options.preserveOriginal) {
            // Note: Current FileRepository doesn't have delete method
            // In production, would implement file deletion
            result.warnings.push(
              `Original file not deleted (delete not implemented): ${fileName}`,
            );
          }
        } catch (error) {
          result.errorMessages.push(
            `Error processing file ${fileName}: ${error}`,
          );
        }
      }

      // Remove original project if moving and not preserving
      if (!options.copyFiles && !options.preserveOriginal) {
        // Note: Current ProjectRepository doesn't have delete method
        // In production, would implement project deletion
        result.warnings.push(
          "Original project not deleted (delete not implemented)",
        );
      }

      result.success = result.errorMessages.length === 0;
    } catch (error) {
      result.errorMessages.push(`Migration failed: ${error}`);
    }

    return this.finalizeResult(result, startTime);
  }

  async batchMigrateProjects(
    migrations: Array<{
      oldName: string;
      newName: string;
      options?: ProjectMigrationOptions;
    }>,
  ): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    for (const migration of migrations) {
      const result = await this.migrateProject(
        migration.oldName,
        migration.newName,
        migration.options,
      );
      results.push(result);

      // Stop on first failure unless continuing is explicitly requested
      if (!result.success && !migration.options?.preserveOriginal) {
        break;
      }
    }

    return results;
  }

  async validateMigrationPlan(
    oldProjectName: string,
    newProjectName: string,
  ): Promise<{
    canMigrate: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check source project
    const sourceExists =
      await this.projectRepository.projectExists(oldProjectName);
    if (!sourceExists) {
      issues.push(`Source project "${oldProjectName}" does not exist`);
    }

    // Check target project
    const targetExists =
      await this.projectRepository.projectExists(newProjectName);
    if (targetExists) {
      issues.push(`Target project "${newProjectName}" already exists`);
      recommendations.push(
        "Use different target name or enable preserveOriginal option",
      );
    }

    // Check file count
    if (sourceExists) {
      const files = await this.fileRepository.listFiles(oldProjectName);
      if (files.length === 0) {
        recommendations.push(
          "Source project has no files - migration not needed",
        );
      } else if (files.length > 100) {
        recommendations.push(
          "Large project - consider batch processing or background migration",
        );
      }
    }

    // Path validation
    if (
      this.isSubPath(oldProjectName, newProjectName) ||
      this.isSubPath(newProjectName, oldProjectName)
    ) {
      issues.push(
        "Cannot migrate to/from nested paths (would create circular reference)",
      );
    }

    return {
      canMigrate: issues.length === 0,
      issues,
      recommendations,
    };
  }

  private updateProjectReferences(
    content: string,
    oldProjectName: string,
    newProjectName: string,
  ): string {
    // Update project name references in content
    let updatedContent = content;

    // Update YAML front-matter project references
    const yamlProjectPattern = new RegExp(
      `project:\\s*["']?${this.escapeRegExp(oldProjectName)}["']?`,
      "gi",
    );
    updatedContent = updatedContent.replace(
      yamlProjectPattern,
      `project: "${newProjectName}"`,
    );

    // Update markdown links to project
    const markdownLinkPattern = new RegExp(
      `\\[([^\\]]+)\\]\\(([^\\)]*${this.escapeRegExp(oldProjectName)}[^\\)]*)\\)`,
      "gi",
    );
    updatedContent = updatedContent.replace(
      markdownLinkPattern,
      (match, linkText, linkUrl) => {
        const updatedUrl = linkUrl.replace(oldProjectName, newProjectName);
        return `[${linkText}](${updatedUrl})`;
      },
    );

    // Update file path references
    const pathReferencePattern = new RegExp(
      `${this.escapeRegExp(oldProjectName)}/`,
      "gi",
    );
    updatedContent = updatedContent.replace(
      pathReferencePattern,
      `${newProjectName}/`,
    );

    return updatedContent;
  }

  private isSubPath(parentPath: string, childPath: string): boolean {
    const parent = parentPath.replace(/\\/g, "/").toLowerCase();
    const child = childPath.replace(/\\/g, "/").toLowerCase();
    return child.startsWith(parent + "/") || child === parent;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private finalizeResult(
    result: MigrationResult,
    startTime: number,
  ): MigrationResult {
    result.duration = Date.now() - startTime;
    return result;
  }
}

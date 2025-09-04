import {
  ProjectMigrationOptions,
  MigrationResult,
} from "../../data/usecases/migrate-project/migrate-project.js";

export interface MigrateProjectUseCase {
  /**
   * Migrate a project to a new name/path
   */
  migrateProject(
    oldProjectName: string,
    newProjectName: string,
    options?: ProjectMigrationOptions,
  ): Promise<MigrationResult>;

  /**
   * Migrate multiple projects in batch
   */
  batchMigrateProjects(
    migrations: Array<{
      oldName: string;
      newName: string;
      options?: ProjectMigrationOptions;
    }>,
  ): Promise<MigrationResult[]>;

  /**
   * Validate migration plan before execution
   */
  validateMigrationPlan(
    oldProjectName: string,
    newProjectName: string,
  ): Promise<{
    canMigrate: boolean;
    issues: string[];
    recommendations: string[];
  }>;
}

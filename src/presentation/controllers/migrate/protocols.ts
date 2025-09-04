import { MigrateProjectUseCase } from "../../../domain/usecases/migrate-project.js";
import {
  ProjectMigrationOptions,
  MigrationResult,
} from "../../../data/usecases/migrate-project/migrate-project.js";
import {
  Controller,
  Request,
  Response,
  Validator,
} from "../../protocols/index.js";

export interface MigrateProjectRequest {
  /**
   * The current project name or path
   */
  oldProjectName: string;

  /**
   * The new project name or path
   */
  newProjectName: string;

  /**
   * Migration options
   */
  options?: {
    /**
     * Copy files instead of moving (default: false)
     */
    copyFiles?: boolean;

    /**
     * Keep original project after migration (default: false)
     */
    preserveOriginal?: boolean;

    /**
     * Update cross-project references in file content (default: true)
     */
    updateReferences?: boolean;

    /**
     * Validate target path doesn't exist (default: true)
     */
    validateTarget?: boolean;
  };
}

export type MigrateProjectResponse = MigrationResult;

export {
  Controller,
  MigrateProjectUseCase,
  ProjectMigrationOptions,
  Request,
  Response,
  Validator,
};

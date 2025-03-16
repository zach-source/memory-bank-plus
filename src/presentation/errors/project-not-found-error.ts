import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when a project is not found.
 */
export class ProjectNotFoundError extends BaseError {
  /**
   * @param projectName The name of the project that was not found
   */
  constructor(projectName: string) {
    super(`Project not found: ${projectName}`, ErrorName.PROJECT_NOT_FOUND);
    this.projectName = projectName;
  }

  projectName: string;
}

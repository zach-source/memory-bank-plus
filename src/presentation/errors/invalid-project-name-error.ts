import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when a project name is invalid.
 */
export class InvalidProjectNameError extends BaseError {
  /**
   * @param projectName The invalid project name
   */
  constructor(projectName: string) {
    super(
      `Invalid project name: ${projectName}`,
      ErrorName.INVALID_PROJECT_NAME
    );
    this.projectName = projectName;
  }

  projectName: string;
}

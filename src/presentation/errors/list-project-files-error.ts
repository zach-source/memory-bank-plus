import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when listing files in a project fails.
 */
export class ListProjectFilesError extends BaseError {
  /**
   * @param projectName The name of the project
   * @param cause Optional cause of the error
   */
  constructor(projectName: string, cause?: Error) {
    super(
      `Failed to list files in project '${projectName}'`,
      ErrorName.LIST_PROJECT_FILES_ERROR
    );
    this.projectName = projectName;
    if (cause) this.cause = cause;
  }

  projectName: string;
}

import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when updating a file fails.
 */
export class UpdateError extends BaseError {
  /**
   * @param projectName The name of the project
   * @param fileName The name of the file that failed to update
   * @param cause Optional cause of the error
   */
  constructor(projectName: string, fileName: string, cause?: Error) {
    super(
      `Failed to update file '${fileName}' in project '${projectName}'`,
      ErrorName.UPDATE_ERROR
    );
    this.projectName = projectName;
    this.fileName = fileName;
    if (cause) this.cause = cause;
  }

  projectName: string;
  fileName: string;
}

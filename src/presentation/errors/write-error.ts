import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when writing a file fails.
 */
export class WriteError extends BaseError {
  /**
   * @param projectName The name of the project
   * @param fileName The name of the file that failed to write
   * @param cause Optional cause of the error
   */
  constructor(projectName: string, fileName: string, cause?: Error) {
    super(
      `Failed to write file '${fileName}' in project '${projectName}'`,
      ErrorName.WRITE_ERROR
    );
    this.projectName = projectName;
    this.fileName = fileName;
    if (cause) this.cause = cause;
  }

  projectName: string;
  fileName: string;
}

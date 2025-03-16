import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when a file is not found in a project.
 */
export class FileNotFoundError extends BaseError {
  /**
   * @param projectName The name of the project
   * @param fileName The name of the file that was not found
   */
  constructor(projectName: string, fileName: string) {
    super(
      `File '${fileName}' not found in project '${projectName}'`,
      ErrorName.FILE_NOT_FOUND
    );
    this.projectName = projectName;
    this.fileName = fileName;
  }

  projectName: string;
  fileName: string;
}

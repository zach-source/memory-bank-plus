import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when a file name is invalid.
 */
export class InvalidFileNameError extends BaseError {
  /**
   * @param fileName The invalid file name
   */
  constructor(fileName: string) {
    super(`Invalid file name: ${fileName}`, ErrorName.INVALID_FILE_NAME);
    this.fileName = fileName;
  }

  fileName: string;
}

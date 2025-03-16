import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when listing projects fails.
 */
export class ListProjectsError extends BaseError {
  /**
   * @param cause Optional cause of the error
   */
  constructor(cause?: Error) {
    super("Failed to list projects", ErrorName.LIST_PROJECTS_ERROR);
    if (cause) this.cause = cause;
  }
}

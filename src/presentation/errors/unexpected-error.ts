import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

/**
 * Error thrown when an unexpected error occurs.
 * Used to wrap unknown errors in a consistent format.
 */
export class UnexpectedError extends BaseError {
  /**
   * @param originalError The original error that was caught
   */
  constructor(originalError: unknown) {
    super("An unexpected error occurred", ErrorName.UNEXPECTED_ERROR);
    this.cause = originalError;
  }
}

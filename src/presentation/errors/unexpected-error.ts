import { BaseError } from "./base-error.js";
import { ErrorName } from "./error-names.js";

export class UnexpectedError extends BaseError {
  constructor(originalError: unknown) {
    super("An unexpected error occurred", ErrorName.UNEXPECTED_ERROR);
    this.cause = originalError;
  }
}

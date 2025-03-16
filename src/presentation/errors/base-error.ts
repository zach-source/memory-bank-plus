import { ErrorName } from "./error-names.js";

/**
 * Abstract base class for all application errors.
 * Provides consistent error naming and structure.
 */
export abstract class BaseError extends Error {
  /**
   * @param message Error message
   * @param name Error name from ErrorName enum
   */
  constructor(message: string, name: ErrorName) {
    super(message);
    this.name = name;
  }
}

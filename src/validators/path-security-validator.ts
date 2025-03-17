import { InvalidParamError } from "../presentation/errors/index.js";
import { Validator } from "../presentation/protocols/validator.js";

export class PathSecurityValidator<T> implements Validator<T> {
  constructor(private readonly fieldName: keyof T & string) {}

  validate(input?: any): Error | null {
    if (!input || !input[this.fieldName]) {
      return null;
    }

    const value = input[this.fieldName];
    if (
      typeof value === "string" &&
      (value.includes("..") || value.includes("/"))
    ) {
      return new InvalidParamError(
        `${this.fieldName} contains invalid path segments`
      );
    }

    return null;
  }
}

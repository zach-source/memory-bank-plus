import { MissingParamError } from "../presentation/errors/index.js";
import { Validator } from "../presentation/protocols/validator.js";

export class RequiredFieldValidator<T> implements Validator<T> {
  constructor(private readonly fieldName: keyof T & string) {}

  validate(input?: any): Error | null {
    if (
      !input ||
      (input[this.fieldName] !== 0 &&
        input[this.fieldName] !== false &&
        !input[this.fieldName])
    ) {
      return new MissingParamError(this.fieldName);
    }
    return null;
  }
}

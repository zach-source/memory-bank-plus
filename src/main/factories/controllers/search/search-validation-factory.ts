import { Validator } from "../../../../presentation/protocols/validator.js";
import {
  RequiredFieldValidator,
  ValidatorComposite,
} from "../../../../validators/index.js";
import { PathSecurityValidator } from "../../../../validators/path-security-validator.js";

const makeValidations = (): Validator[] => {
  return [
    new RequiredFieldValidator("query"),
    // Optional projectName should be validated if provided
    // Note: We may need a conditional validator for optional fields with security checks
  ];
};

export const makeSearchValidation = (): Validator => {
  const validations = makeValidations();
  return new ValidatorComposite(validations);
};
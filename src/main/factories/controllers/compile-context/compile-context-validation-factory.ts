import { Validator } from "../../../../presentation/protocols/validator.js";
import {
  RequiredFieldValidator,
  ValidatorComposite,
} from "../../../../validators/index.js";

const makeValidations = (): Validator[] => {
  return [
    new RequiredFieldValidator("query"),
  ];
};

export const makeCompileContextValidation = (): Validator => {
  const validations = makeValidations();
  return new ValidatorComposite(validations);
};
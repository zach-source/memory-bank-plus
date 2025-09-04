import { Validator } from "../../../../presentation/protocols/validator.js";
import {
  RequiredFieldValidator,
  ValidatorComposite,
  PathSecurityValidator,
} from "../../../../validators/index.js";

const makeValidations = (): Validator[] => {
  return [
    new RequiredFieldValidator("oldProjectName"),
    new RequiredFieldValidator("newProjectName"),
    new PathSecurityValidator("oldProjectName"),
    new PathSecurityValidator("newProjectName"),
  ];
};

export const makeMigrateValidation = (): Validator => {
  const validations = makeValidations();
  return new ValidatorComposite(validations);
};

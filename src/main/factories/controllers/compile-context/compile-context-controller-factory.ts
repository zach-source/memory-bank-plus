import { CompileContextController } from "../../../../presentation/controllers/compile-context/compile-context-controller.js";
import { makeCompileContext } from "../../use-cases/compile-context-factory.js";
import { makeCompileContextValidation } from "./compile-context-validation-factory.js";

export const makeCompileContextController = () => {
  const validator = makeCompileContextValidation();
  const compileContextUseCase = makeCompileContext();

  return new CompileContextController(compileContextUseCase, validator);
};
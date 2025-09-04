import { MigrateController } from "../../../../presentation/controllers/migrate/migrate-controller.js";
import { makeMigrateProject } from "../../use-cases/migrate-project-factory.js";
import { makeMigrateValidation } from "./migrate-validation-factory.js";

export const makeMigrateController = () => {
  const validator = makeMigrateValidation();
  const migrateProjectUseCase = makeMigrateProject();

  return new MigrateController(migrateProjectUseCase, validator);
};

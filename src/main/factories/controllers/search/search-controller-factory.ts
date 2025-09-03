import { SearchController } from "../../../../presentation/controllers/search/search-controller.js";
import { makeSearchMemory } from "../../use-cases/search-memory-factory.js";
import { makeSearchValidation } from "./search-validation-factory.js";

export const makeSearchController = () => {
  const validator = makeSearchValidation();
  const searchMemoryUseCase = makeSearchMemory();

  return new SearchController(searchMemoryUseCase, validator);
};
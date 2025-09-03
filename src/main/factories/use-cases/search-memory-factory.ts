import { SearchMemory } from "../../../data/usecases/search-memory/search-memory.js";
import { QdrantVectorRepository } from "../../../infra/vector/qdrant-vector-repository.js";
import { env } from "../../config/env.js";

export const makeSearchMemory = () => {
  const vectorRepository = new QdrantVectorRepository(env.qdrant);

  return new SearchMemory(vectorRepository);
};
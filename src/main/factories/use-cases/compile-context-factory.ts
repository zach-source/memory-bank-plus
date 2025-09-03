import { CompileContext } from "../../../data/usecases/compile-context/compile-context.js";
import { QdrantVectorRepository, QdrantSummaryRepository } from "../../../infra/vector/index.js";
import { MockLLMService } from "../../../infra/llm/index.js";
import { env } from "../../config/env.js";

export const makeCompileContext = () => {
  const vectorRepository = new QdrantVectorRepository(env.qdrant);
  const summaryRepository = new QdrantSummaryRepository(env.qdrant);
  const llmService = new MockLLMService();

  return new CompileContext(vectorRepository, summaryRepository, llmService);
};
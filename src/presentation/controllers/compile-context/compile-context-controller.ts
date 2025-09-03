import { badRequest, ok, serverError } from "../../helpers/index.js";
import {
  Controller,
  Request,
  Response,
  CompileContextRequest,
  CompileContextResponse,
  CompileContextUseCase,
  ContextBudget,
  Validator,
} from "./protocols.js";

export class CompileContextController implements Controller<CompileContextRequest, CompileContextResponse> {
  constructor(
    private readonly compileContextUseCase: CompileContextUseCase,
    private readonly validator: Validator
  ) {}

  async handle(request: Request<CompileContextRequest>): Promise<Response<CompileContextResponse>> {
    try {
      const validationError = this.validator.validate(request.body);
      if (validationError) {
        return badRequest(validationError);
      }

      const {
        query,
        maxTokens = 4000,
        reservedTokens,
        compressionTarget = 0.3,
        projectName,
        includeFiles = true,
        includeSummaries = true,
        compressionMethod = 'llmlingua',
        prioritizeRecent = true,
        maxRelevanceThreshold = 0.5,
      } = request.body!;

      // Calculate budget
      const calculatedReservedTokens = reservedTokens || Math.min(1000, Math.floor(maxTokens * 0.2));
      const budget: ContextBudget = {
        maxTokens,
        reservedTokens: calculatedReservedTokens,
        availableTokens: maxTokens - calculatedReservedTokens,
        usedTokens: 0,
        compressionTarget,
      };

      // Compile context
      const compilation = await this.compileContextUseCase.compileContext(
        query,
        budget,
        {
          projectName,
          includeFiles,
          includeSummaries,
          compressionMethod,
          prioritizeRecent,
          maxRelevanceThreshold,
        }
      );

      return ok(compilation);
    } catch (error) {
      return serverError(error as Error);
    }
  }
}
import { badRequest, ok, serverError } from "../../helpers/index.js";
import {
  Controller,
  GlobalMemoryUseCase,
  Request,
  Response,
  SearchGlobalMemoriesRequest,
  SearchGlobalMemoriesResponse,
  StoreGlobalMemoryRequest,
  StoreGlobalMemoryResponse,
  GetContextualMemoriesRequest,
  GetContextualMemoriesResponse,
  PromoteToGlobalRequest,
  PromoteToGlobalResponse,
  Validator,
} from "./protocols.js";

export class StoreGlobalMemoryController
  implements Controller<StoreGlobalMemoryRequest, StoreGlobalMemoryResponse>
{
  constructor(
    private readonly globalMemoryUseCase: GlobalMemoryUseCase,
    private readonly validator: Validator,
  ) {}

  async handle(
    request: Request<StoreGlobalMemoryRequest>,
  ): Promise<Response<StoreGlobalMemoryResponse>> {
    try {
      const validationError = this.validator.validate(request.body);
      if (validationError) {
        return badRequest(validationError);
      }

      const {
        title,
        content,
        type,
        tags,
        salience,
        complexity,
        sourceProjects,
      } = request.body!;

      const globalMemory = await this.globalMemoryUseCase.storeGlobalLesson(
        title,
        content,
        type,
        {
          tags,
          salience,
          complexity,
          source_projects: sourceProjects,
        },
      );

      return ok(globalMemory);
    } catch (error) {
      return serverError(error as Error);
    }
  }
}

export class SearchGlobalMemoriesController
  implements
    Controller<SearchGlobalMemoriesRequest, SearchGlobalMemoriesResponse>
{
  constructor(
    private readonly globalMemoryUseCase: GlobalMemoryUseCase,
    private readonly validator: Validator,
  ) {}

  async handle(
    request: Request<SearchGlobalMemoriesRequest>,
  ): Promise<Response<SearchGlobalMemoriesResponse>> {
    try {
      const validationError = this.validator.validate(request.body);
      if (validationError) {
        return badRequest(validationError);
      }

      const {
        query,
        type,
        tags,
        minSalience,
        minReusability,
        sourceProjects,
        excludeProjects,
        limit,
      } = request.body!;

      const globalMemoryQuery = {
        query,
        type,
        tags,
        min_salience: minSalience,
        min_reusability: minReusability,
        source_projects: sourceProjects,
        exclude_projects: excludeProjects,
        limit,
      };

      const memories =
        await this.globalMemoryUseCase.searchGlobalMemories(globalMemoryQuery);

      return ok(memories);
    } catch (error) {
      return serverError(error as Error);
    }
  }
}

export class GetContextualMemoriesController
  implements
    Controller<GetContextualMemoriesRequest, GetContextualMemoriesResponse>
{
  constructor(
    private readonly globalMemoryUseCase: GlobalMemoryUseCase,
    private readonly validator: Validator,
  ) {}

  async handle(
    request: Request<GetContextualMemoriesRequest>,
  ): Promise<Response<GetContextualMemoriesResponse>> {
    try {
      const validationError = this.validator.validate(request.body);
      if (validationError) {
        return badRequest(validationError);
      }

      const { currentProject, contextQuery, limit } = request.body!;

      const memories = await this.globalMemoryUseCase.getContextualMemories(
        currentProject,
        contextQuery,
        limit,
      );

      return ok(memories);
    } catch (error) {
      return serverError(error as Error);
    }
  }
}

export class PromoteToGlobalController
  implements Controller<PromoteToGlobalRequest, PromoteToGlobalResponse>
{
  constructor(
    private readonly globalMemoryUseCase: GlobalMemoryUseCase,
    private readonly validator: Validator,
  ) {}

  async handle(
    request: Request<PromoteToGlobalRequest>,
  ): Promise<Response<PromoteToGlobalResponse>> {
    try {
      const validationError = this.validator.validate(request.body);
      if (validationError) {
        return badRequest(validationError);
      }

      const { projectName, fileName, globalType, additionalMetadata } =
        request.body!;

      const globalMemory = await this.globalMemoryUseCase.promoteToGlobal(
        projectName,
        fileName,
        globalType,
        additionalMetadata,
      );

      return ok(globalMemory);
    } catch (error) {
      return serverError(error as Error);
    }
  }
}

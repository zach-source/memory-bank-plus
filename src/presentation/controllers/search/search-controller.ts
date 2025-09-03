import { badRequest, ok, serverError } from "../../helpers/index.js";
import {
  Controller,
  Request,
  Response,
  SearchControllerResponse,
  SearchMemoryUseCase,
  SearchRequest,
  Validator,
} from "./protocols.js";

export class SearchController implements Controller<SearchRequest, SearchControllerResponse> {
  constructor(
    private readonly searchMemoryUseCase: SearchMemoryUseCase,
    private readonly validator: Validator
  ) {}

  async handle(request: Request<SearchRequest>): Promise<Response<SearchControllerResponse>> {
    try {
      const validationError = this.validator.validate(request.body);
      if (validationError) {
        return badRequest(validationError);
      }

      const searchQuery = request.body!;

      const searchResponse = await this.searchMemoryUseCase.search(searchQuery);

      return ok(searchResponse);
    } catch (error) {
      return serverError(error as Error);
    }
  }
}
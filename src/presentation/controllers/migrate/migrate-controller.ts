import { badRequest, ok, serverError } from "../../helpers/index.js";
import {
  Controller,
  MigrateProjectRequest,
  MigrateProjectResponse,
  MigrateProjectUseCase,
  Request,
  Response,
  Validator,
} from "./protocols.js";

export class MigrateController
  implements Controller<MigrateProjectRequest, MigrateProjectResponse>
{
  constructor(
    private readonly migrateProjectUseCase: MigrateProjectUseCase,
    private readonly validator: Validator,
  ) {}

  async handle(
    request: Request<MigrateProjectRequest>,
  ): Promise<Response<MigrateProjectResponse>> {
    try {
      const validationError = this.validator.validate(request.body);
      if (validationError) {
        return badRequest(validationError);
      }

      const { oldProjectName, newProjectName, options } = request.body!;

      const migrationResult = await this.migrateProjectUseCase.migrateProject(
        oldProjectName,
        newProjectName,
        options,
      );

      return ok(migrationResult);
    } catch (error) {
      return serverError(error as Error);
    }
  }
}

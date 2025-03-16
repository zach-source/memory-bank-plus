import { ListProjectFilesUseCase } from "../../../domain/usecases/list-project-files.js";
import {
  ListProjectFilesError,
  ProjectNotFoundError,
} from "../../errors/index.js";
import {
  Controller,
  Request,
  Response,
  Validator,
} from "../../protocols/index.js";

export interface ListProjectFilesRequest {
  projectName: string;
}

export type ListProjectFilesResponse = string[];

export {
  Controller,
  ListProjectFilesError,
  ListProjectFilesUseCase,
  ProjectNotFoundError,
  Request,
  Response,
  Validator,
};

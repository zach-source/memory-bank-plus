import { ListProjectsUseCase } from "../../../domain/usecases/list-projects.js";
import { ListProjectsError } from "../../errors/list-projects-error.js";
import { Controller, Response } from "../../protocols/index.js";

export type ListProjectsResponse = string[];

export { Controller, ListProjectsError, ListProjectsUseCase, Response };

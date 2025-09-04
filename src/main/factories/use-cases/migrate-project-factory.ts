import { MigrateProject } from "../../../data/usecases/migrate-project/migrate-project.js";
import {
  FsFileRepository,
  FsProjectRepository,
} from "../../../infra/filesystem/index.js";
import { env } from "../../config/env.js";

export const makeMigrateProject = () => {
  const fileRepository = new FsFileRepository(env.rootPath);
  const projectRepository = new FsProjectRepository(env.rootPath);

  return new MigrateProject(fileRepository, projectRepository);
};

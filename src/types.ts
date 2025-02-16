export const CORE_FILES = [
  "projectbrief.md",
  "productContext.md",
  "activeContext.md",
  "systemPatterns.md",
  "techContext.md",
  "progress.md",
  ".clinerules",
] as const;

export type CoreFileName = (typeof CORE_FILES)[number];

export type MemoryBankOperation =
  | "read"
  | "write"
  | "update"
  | "list_projects"
  | "list_project_files";

export interface BaseMemoryBankCommand {
  operation: MemoryBankOperation;
}

export interface FileMemoryBankCommand extends BaseMemoryBankCommand {
  operation: "read" | "write" | "update";
  projectName: string;
  fileName: CoreFileName;
  content?: string;
}

export interface ListProjectsMemoryBankCommand extends BaseMemoryBankCommand {
  operation: "list_projects";
}

export interface ListProjectFilesMemoryBankCommand
  extends BaseMemoryBankCommand {
  operation: "list_project_files";
  projectName: string;
}

export type MemoryBankCommand =
  | FileMemoryBankCommand
  | ListProjectsMemoryBankCommand
  | ListProjectFilesMemoryBankCommand;

export interface MemoryBankConfig {
  rootPath: string;
}

export interface FileOperationResult {
  success: boolean;
  content?: string;
  error?: string;
}

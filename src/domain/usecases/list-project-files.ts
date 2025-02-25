export interface ListProjectFilesParams {
  projectName: string;
}

export interface ListProjectFilesUseCase {
  listProjectFiles(params: ListProjectFilesParams): Promise<string[]>;
}

export interface UpdateFileParams {
  projectName: string;
  fileName: string;
  content: string;
}

export interface UpdateFileUseCase {
  updateFile(params: UpdateFileParams): Promise<void>;
}

export interface ReadFileParams {
  projectName: string;
  fileName: string;
}

export interface ReadFileUseCase {
  readFile(params: ReadFileParams): Promise<string | null>;
}

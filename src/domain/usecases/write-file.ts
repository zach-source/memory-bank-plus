export interface WriteFileParams {
  projectName: string;
  fileName: string;
  content: string;
}

export interface WriteFileUseCase {
  writeFile(params: WriteFileParams): Promise<string | null>;
}

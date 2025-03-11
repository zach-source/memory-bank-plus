export interface FileRepository {
  listFiles(projectName: string): Promise<string[]>;
  loadFile(projectName: string, fileName: string): Promise<string | null>;
  writeFile(
    projectName: string,
    fileName: string,
    content: string
  ): Promise<void>;
  updateFile(
    projectName: string,
    fileName: string,
    content: string
  ): Promise<void>;
}

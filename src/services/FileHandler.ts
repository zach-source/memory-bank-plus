import fs from "fs-extra";
import { join } from "path";
import {
  CORE_FILES,
  CoreFileName,
  FileMemoryBankCommand,
  FileOperationResult,
  MemoryBankCommand,
  MemoryBankConfig,
} from "../types.js";

export class FileHandler {
  private rootPath: string;

  constructor(config: MemoryBankConfig) {
    this.rootPath = config.rootPath;
  }

  private getProjectPath(projectName: string): string {
    return join(this.rootPath, projectName);
  }

  private getFilePath(projectName: string, fileName: CoreFileName): string {
    return join(this.getProjectPath(projectName), fileName);
  }

  private async validateProjectName(projectName: string): Promise<boolean> {
    // Prevent path traversal and ensure project name is valid
    if (
      !projectName ||
      projectName.includes("..") ||
      projectName.includes("/")
    ) {
      return false;
    }
    return true;
  }

  private async ensureProjectDirectory(projectName: string): Promise<void> {
    const projectPath = this.getProjectPath(projectName);
    await fs.ensureDir(projectPath);
  }

  private async validateFileName(fileName: string): Promise<boolean> {
    return CORE_FILES.includes(fileName as CoreFileName);
  }

  private async listDirectoryContents(path: string): Promise<string[]> {
    try {
      const contents = await fs.readdir(path);
      return contents;
    } catch (error) {
      return [];
    }
  }

  public async handleCommand(
    command: MemoryBankCommand
  ): Promise<FileOperationResult> {
    try {
      if (command.operation === "list_projects") {
        const contents = await this.listDirectoryContents(this.rootPath);
        return {
          success: true,
          content: JSON.stringify(contents),
        };
      }

      if (command.operation === "list_project_files") {
        if (!(await this.validateProjectName(command.projectName))) {
          return {
            success: false,
            error: "Invalid project name. Must not contain '..' or '/'",
          };
        }

        const projectPath = this.getProjectPath(command.projectName);
        if (!(await fs.pathExists(projectPath))) {
          return {
            success: false,
            error: "Project directory does not exist",
          };
        }

        const contents = await this.listDirectoryContents(projectPath);
        return {
          success: true,
          content: JSON.stringify(contents),
        };
      }

      // Handle file operations
      if (!(await this.validateProjectName(command.projectName))) {
        return {
          success: false,
          error: "Invalid project name. Must not contain '..' or '/'",
        };
      }

      // Validate file name
      if (!(await this.validateFileName(command.fileName))) {
        return {
          success: false,
          error: `Invalid file name. Must be one of: ${CORE_FILES.join(", ")}`,
        };
      }

      // Ensure project directory exists
      await this.ensureProjectDirectory(command.projectName);

      const fileCommand = command as FileMemoryBankCommand;
      const filePath = this.getFilePath(
        fileCommand.projectName,
        fileCommand.fileName
      );

      switch (fileCommand.operation) {
        case "read": {
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            return { success: true, content };
          }
          return {
            success: false,
            error: "File does not exist",
          };
        }

        case "write": {
          if (!command.content) {
            return {
              success: false,
              error: "Content is required for write operation",
            };
          }
          if (await fs.pathExists(filePath)) {
            return {
              success: false,
              error:
                "File already exists. Use update operation to modify existing files.",
            };
          }
          await fs.writeFile(filePath, command.content, "utf-8");
          return { success: true };
        }

        case "update": {
          if (!command.content) {
            return {
              success: false,
              error: "Content is required for update operation",
            };
          }
          if (!(await fs.pathExists(filePath))) {
            return {
              success: false,
              error:
                "File does not exist. Use write operation to create new files.",
            };
          }
          await fs.writeFile(filePath, command.content, "utf-8");
          return { success: true };
        }

        default: {
          const _exhaustiveCheck: never = fileCommand.operation;
          return {
            success: false,
            error: "Invalid operation",
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }
}

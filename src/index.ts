import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ServerResult,
} from "@modelcontextprotocol/sdk/types.js";
import { FileHandler } from "./services/FileHandler.js";
import {
  CORE_FILES,
  CoreFileName,
  MemoryBankCommand,
  MemoryBankConfig,
} from "./types.js";

const DEFAULT_CONFIG: MemoryBankConfig = {
  rootPath: process.env.MEMORY_BANK_ROOT || "/memory-bank",
};

interface MemoryBankReadArgs {
  projectName: string;
  fileName: CoreFileName;
}

interface MemoryBankWriteArgs extends MemoryBankReadArgs {
  content: string;
}

interface MemoryBankUpdateArgs extends MemoryBankReadArgs {
  content: string;
}

const memoryBankTools = {
  list_projects: {
    name: "list_projects",
    description: "List all projects in the memory bank",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  list_project_files: {
    name: "list_project_files",
    description: "List all files within a specific project",
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string" },
      },
      required: ["projectName"],
    },
  },
  memory_bank_read: {
    name: "memory_bank_read",
    description: "Read a memory bank file for a specific project",
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string" },
        fileName: {
          type: "string",
          enum: CORE_FILES,
        },
      },
      required: ["projectName", "fileName"],
    },
  },
  memory_bank_write: {
    name: "memory_bank_write",
    description: "Create a new memory bank file for a specific project",
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string" },
        fileName: {
          type: "string",
          enum: CORE_FILES,
        },
        content: { type: "string" },
      },
      required: ["projectName", "fileName", "content"],
    },
  },
  memory_bank_update: {
    name: "memory_bank_update",
    description: "Update an existing memory bank file for a specific project",
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string" },
        fileName: {
          type: "string",
          enum: CORE_FILES,
        },
        content: { type: "string" },
      },
      required: ["projectName", "fileName", "content"],
    },
  },
};

export class MemoryBankServer {
  private server: Server;
  private fileHandler: FileHandler;

  constructor(config: Partial<MemoryBankConfig> = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    this.fileHandler = new FileHandler(finalConfig);

    this.server = new Server(
      {
        name: "memory-bank",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            memory_bank_read: memoryBankTools.memory_bank_read,
            memory_bank_write: memoryBankTools.memory_bank_write,
            memory_bank_update: memoryBankTools.memory_bank_update,
            list_projects: memoryBankTools.list_projects,
            list_project_files: memoryBankTools.list_project_files,
          },
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error: unknown) =>
      console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private validateArgs<T extends { fileName: CoreFileName }>(
    args: Record<string, unknown>
  ): T {
    const validatedArgs = args as T;
    if (!CORE_FILES.includes(validatedArgs.fileName as CoreFileName)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid fileName. Must be one of: ${CORE_FILES.join(", ")}`
      );
    }
    return validatedArgs;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        memoryBankTools.memory_bank_read,
        memoryBankTools.memory_bank_write,
        memoryBankTools.memory_bank_update,
        memoryBankTools.list_projects,
        memoryBankTools.list_project_files,
      ],
    }));

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request): Promise<ServerResult> => {
        const { name, arguments: args } = request.params;

        if (!args || typeof args !== "object") {
          throw new McpError(ErrorCode.InvalidParams, "No arguments provided");
        }

        try {
          let command: MemoryBankCommand;

          switch (name) {
            case "list_projects": {
              command = {
                operation: "list_projects",
              };
              break;
            }

            case "list_project_files": {
              const { projectName } = args as { projectName: string };
              command = {
                operation: "list_project_files",
                projectName,
              };
              break;
            }

            case "memory_bank_read": {
              const readArgs = this.validateArgs<MemoryBankReadArgs>(args);
              command = {
                operation: "read",
                projectName: readArgs.projectName,
                fileName: readArgs.fileName,
              };
              break;
            }

            case "memory_bank_write": {
              const writeArgs = this.validateArgs<MemoryBankWriteArgs>(args);
              command = {
                operation: "write",
                projectName: writeArgs.projectName,
                fileName: writeArgs.fileName,
                content: writeArgs.content,
              };
              break;
            }

            case "memory_bank_update": {
              const updateArgs = this.validateArgs<MemoryBankUpdateArgs>(args);
              command = {
                operation: "update",
                projectName: updateArgs.projectName,
                fileName: updateArgs.fileName,
                content: updateArgs.content,
              };
              break;
            }

            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${name}`
              );
          }

          const result = await this.fileHandler.handleCommand(command);

          if (!result.success) {
            throw new McpError(
              ErrorCode.InternalError,
              result.error || "Unknown error"
            );
          }

          return {
            content: [
              {
                type: "text",
                text: result.content || "Operation completed successfully",
              },
            ],
            isError: false,
          };
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            ErrorCode.InternalError,
            `Operation failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Memory Bank MCP server running on stdio");
  }
}

// Start the server if this file is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = new MemoryBankServer();
  server.run().catch(console.error);
}

export default MemoryBankServer;

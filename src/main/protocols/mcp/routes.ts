import {
  makeCompileContextController,
  makeListProjectFilesController,
  makeListProjectsController,
  makeMigrateController,
  makeReadController,
  makeSearchController,
  makeUpdateController,
  makeWriteController,
} from "../../factories/controllers/index.js";
import { adaptMcpRequestHandler } from "./adapters/mcp-request-adapter.js";
import { McpRouterAdapter } from "./adapters/mcp-router-adapter.js";

export default () => {
  const router = new McpRouterAdapter();

  router.setTool({
    schema: {
      name: "list_projects",
      description: "List all projects in the memory bank",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    handler: adaptMcpRequestHandler(makeListProjectsController()),
  });

  router.setTool({
    schema: {
      name: "list_project_files",
      description: "List all files within a specific project",
      inputSchema: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "The name of the project",
          },
        },
        required: ["projectName"],
      },
    },
    handler: adaptMcpRequestHandler(makeListProjectFilesController()),
  });

  router.setTool({
    schema: {
      name: "memory_bank_read",
      description: "Read a memory bank file for a specific project",
      inputSchema: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "The name of the project",
          },
          fileName: {
            type: "string",
            description: "The name of the file",
          },
        },
        required: ["projectName", "fileName"],
      },
    },
    handler: adaptMcpRequestHandler(makeReadController()),
  });

  router.setTool({
    schema: {
      name: "memory_bank_write",
      description: "Create a new memory bank file for a specific project",
      inputSchema: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "The name of the project",
          },
          fileName: {
            type: "string",
            description: "The name of the file",
          },
          content: {
            type: "string",
            description: "The content of the file",
          },
        },
        required: ["projectName", "fileName", "content"],
      },
    },
    handler: adaptMcpRequestHandler(makeWriteController()),
  });

  router.setTool({
    schema: {
      name: "memory_bank_update",
      description: "Update an existing memory bank file for a specific project",
      inputSchema: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "The name of the project",
          },
          fileName: {
            type: "string",
            description: "The name of the file",
          },
          content: {
            type: "string",
            description: "The content of the file",
          },
        },
        required: ["projectName", "fileName", "content"],
      },
    },
    handler: adaptMcpRequestHandler(makeUpdateController()),
  });

  router.setTool({
    schema: {
      name: "memory_search",
      description:
        "Search memory bank files using hybrid semantic and keyword search with advanced ranking",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query text",
          },
          projectName: {
            type: "string",
            description: "Optional project name to scope the search",
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Optional tags to filter results",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default: 20)",
            minimum: 1,
            maximum: 100,
          },
          semanticWeight: {
            type: "number",
            description: "Weight for semantic similarity score (default: 0.4)",
            minimum: 0,
            maximum: 1,
          },
          recencyWeight: {
            type: "number",
            description: "Weight for recency score (default: 0.2)",
            minimum: 0,
            maximum: 1,
          },
          frequencyWeight: {
            type: "number",
            description: "Weight for frequency score (default: 0.2)",
            minimum: 0,
            maximum: 1,
          },
          salienceWeight: {
            type: "number",
            description: "Weight for salience score (default: 0.2)",
            minimum: 0,
            maximum: 1,
          },
          timeDecayDays: {
            type: "number",
            description: "Days for time decay calculation (default: 30)",
            minimum: 1,
          },
        },
        required: ["query"],
      },
    },
    handler: adaptMcpRequestHandler(makeSearchController()),
  });

  router.setTool({
    schema: {
      name: "memory_compileContext",
      description:
        "Compile and compress memory bank content into an optimal context for LLM consumption with budget constraints",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The query to compile context for",
          },
          maxTokens: {
            type: "number",
            description:
              "Maximum tokens for the compiled context (default: 4000)",
            minimum: 500,
            maximum: 32000,
          },
          reservedTokens: {
            type: "number",
            description: "Reserved tokens for system prompts, etc.",
            minimum: 0,
          },
          compressionTarget: {
            type: "number",
            description:
              "Target compression ratio if budget exceeded (0-1, default: 0.3)",
            minimum: 0.1,
            maximum: 0.9,
          },
          projectName: {
            type: "string",
            description: "Optional project name to scope the search",
          },
          includeFiles: {
            type: "boolean",
            description: "Include individual files in context (default: true)",
          },
          includeSummaries: {
            type: "boolean",
            description:
              "Include hierarchical summaries in context (default: true)",
          },
          compressionMethod: {
            type: "string",
            enum: ["llmlingua", "summarization", "extraction"],
            description:
              "Compression method to use if needed (default: llmlingua)",
          },
          prioritizeRecent: {
            type: "boolean",
            description: "Prioritize recent content (default: true)",
          },
          maxRelevanceThreshold: {
            type: "number",
            description: "Minimum relevance threshold (0-1, default: 0.5)",
            minimum: 0,
            maximum: 1,
          },
        },
        required: ["query"],
      },
    },
    handler: adaptMcpRequestHandler(makeCompileContextController()),
  });

  router.setTool({
    schema: {
      name: "memory_migrateProject",
      description:
        "Migrate a memory bank project to a new name or path with optional reference updates",
      inputSchema: {
        type: "object",
        properties: {
          oldProjectName: {
            type: "string",
            description: "The current project name or path to migrate from",
          },
          newProjectName: {
            type: "string",
            description: "The new project name or path to migrate to",
          },
          options: {
            type: "object",
            properties: {
              copyFiles: {
                type: "boolean",
                description: "Copy files instead of moving (default: false)",
              },
              preserveOriginal: {
                type: "boolean",
                description:
                  "Keep original project after migration (default: false)",
              },
              updateReferences: {
                type: "boolean",
                description:
                  "Update cross-project references in file content (default: true)",
              },
              validateTarget: {
                type: "boolean",
                description:
                  "Validate target path doesn't exist (default: true)",
              },
            },
          },
        },
        required: ["oldProjectName", "newProjectName"],
      },
    },
    handler: adaptMcpRequestHandler(makeMigrateController()),
  });

  return router;
};

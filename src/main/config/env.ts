import path from "path";
import fs from "fs-extra";

/**
 * Resolve memory bank root path with backward compatibility
 * Supports both legacy and hidden directory conventions
 */
const resolveMemoryBankRoot = (): string => {
  // If explicitly set, use that path
  if (process.env.MEMORY_BANK_ROOT) {
    return process.env.MEMORY_BANK_ROOT;
  }

  // Check for existing legacy directories (backward compatibility)
  const legacyPaths = ["./memory_bank", "./memory-bank", "./memory-banks"];
  for (const legacyPath of legacyPaths) {
    if (fs.existsSync(legacyPath)) {
      console.warn(`Using legacy memory bank directory: ${legacyPath}`);
      console.warn("Consider migrating to hidden directory: .memory_bank");
      return legacyPath;
    }
  }

  // Default to hidden directory
  return "./.memory_bank";
};

export const env = {
  rootPath: resolveMemoryBankRoot(),

  // Global memory configuration
  globalProjectName: "__GLOBAL__",
  globalProjectHidden: ".__global__", // Hidden alternative

  // Qdrant configuration
  qdrant: {
    url: process.env.QDRANT_URL,
    host: process.env.QDRANT_HOST || "localhost",
    port: parseInt(process.env.QDRANT_PORT || "6333"),
    apiKey: process.env.QDRANT_API_KEY,
  },
};

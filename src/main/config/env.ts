export const env = {
  rootPath: process.env.MEMORY_BANK_ROOT!,
  
  // Qdrant configuration
  qdrant: {
    url: process.env.QDRANT_URL,
    host: process.env.QDRANT_HOST || "localhost",
    port: parseInt(process.env.QDRANT_PORT || "6333"),
    apiKey: process.env.QDRANT_API_KEY,
  },
};

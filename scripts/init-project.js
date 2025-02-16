#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeProject(projectName, rootDir) {
  if (!projectName) {
    console.error("Error: Project name is required");
    process.exit(1);
  }

  const projectDir = path.join(rootDir, projectName);

  // Core memory bank files
  const coreFiles = {
    "projectbrief.md":
      "# Project Brief\n\n## Project Overview\n\n## Core Requirements\n\n## Success Criteria\n",
    "productContext.md":
      "# Product Context\n\n## Problem Statement\n\n## Solution\n\n## User Experience Goals\n\n## Integration Points\n",
    "systemPatterns.md":
      "# System Patterns\n\n## Architecture Overview\n\n## Core Components\n\n## Type System\n\n## Security Patterns\n\n## Error Handling\n",
    "techContext.md":
      "# Technical Context\n\n## Development Stack\n\n## Dependencies\n\n## Development Setup\n\n## Constraints\n\n## Configuration\n",
    "activeContext.md":
      "# Active Context\n\n## Current Status\n\n## Recent Changes\n\n## Current Focus\n\n## Next Steps\n\n## Active Decisions\n",
    "progress.md":
      "# Progress\n\n## Completed ✅\n\n## In Progress 🚧\n\n## Known Issues 🐛\n\n## Next Up 📋\n\n## Future Features 🔮\n",
    ".clinerules":
      "# Project Rules\n\n## Project Patterns\n\n## Preferences\n\n## Important Paths\n\n## Project Intelligence\n",
  };

  try {
    // Create project directory
    await fs.ensureDir(projectDir);
    console.log(`Created project directory: ${projectDir}`);

    // Create each core file
    for (const [filename, content] of Object.entries(coreFiles)) {
      const filePath = path.join(projectDir, filename);
      await fs.writeFile(filePath, content, "utf8");
      console.log(`Created ${filename}`);
    }

    console.log("\nProject initialized successfully! 🎉");
    console.log("\nNext steps:");
    console.log("1. Update projectbrief.md with your project details");
    console.log("2. Configure your project-specific requirements");
    console.log("3. Start documenting in activeContext.md");
  } catch (error) {
    console.error("Error initializing project:", error.message);
    process.exit(1);
  }
}

// Get arguments
const args = process.argv.slice(2);
const projectName = args[0];
const rootDir = args[1] || process.env.MEMORY_BANK_ROOT || ".";

initializeProject(projectName, rootDir);

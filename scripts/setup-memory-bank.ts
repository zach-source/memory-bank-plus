#!/usr/bin/env node

/**
 * Memory Bank Setup Utility
 *
 * Provides convenient commands for setting up and managing memory banks
 */

import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import { spawn } from "child_process";

interface SetupOptions {
  hidden?: boolean;
  global?: boolean;
  qdrantUrl?: string;
  force?: boolean;
}

interface MemoryBankConfig {
  rootPath: string;
  qdrantUrl: string;
  globalProjectName: string;
  createdAt: string;
  version: string;
}

class MemoryBankSetup {
  async initializeMemoryBank(
    targetPath: string,
    options: SetupOptions = {},
  ): Promise<void> {
    console.log("🚀 Initializing Memory Bank...");

    // Resolve target path
    const resolvedPath = path.resolve(targetPath);
    const dirName = path.basename(resolvedPath);

    // Make hidden if requested or if path doesn't start with dot
    const finalPath =
      options.hidden && !dirName.startsWith(".")
        ? path.join(path.dirname(resolvedPath), `.${dirName}`)
        : resolvedPath;

    // Check if directory exists
    if ((await fs.pathExists(finalPath)) && !options.force) {
      console.error(`❌ Directory already exists: ${finalPath}`);
      console.log("Use --force to overwrite existing directory");
      return;
    }

    // Create directory structure
    await fs.ensureDir(finalPath);
    console.log(`✅ Created memory bank directory: ${finalPath}`);

    // Create global project if requested
    if (options.global) {
      const globalPath = path.join(finalPath, ".__global__");
      await fs.ensureDir(globalPath);

      // Create sample global memory
      const sampleGlobal = `---
tags: [welcome, setup, global]
salience: 0.9
type: "lesson"
---

# Welcome to Memory Bank Plus

This is your global memory space for cross-project knowledge.

## Getting Started
- Store universal principles and lessons here
- Access from any project context
- High-value knowledge with broad applicability

## Global Memory Types
- **lessons**: Important lessons learned
- **principles**: Core guidelines and rules
- **patterns**: Reusable implementation patterns
- **best_practices**: Proven approaches
- **insights**: Deep technical insights
`;

      await fs.writeFile(
        path.join(globalPath, "welcome.md"),
        sampleGlobal,
        "utf-8",
      );
      console.log("✅ Created global memory space with sample content");
    }

    // Create configuration file
    const config: MemoryBankConfig = {
      rootPath: finalPath,
      qdrantUrl: options.qdrantUrl || "http://localhost:6333",
      globalProjectName: ".__global__",
      createdAt: new Date().toISOString(),
      version: "1.0.0",
    };

    await fs.writeFile(
      path.join(finalPath, ".memory_bank_config.json"),
      JSON.stringify(config, null, 2),
      "utf-8",
    );

    console.log("✅ Created configuration file");
    console.log("\n📋 Next Steps:");
    console.log(
      `   1. Set environment: export MEMORY_BANK_ROOT="${finalPath}"`,
    );
    console.log("   2. Start Qdrant: docker run -p 6333:6333 qdrant/qdrant");
    console.log("   3. Configure your MCP client to use memory-bank-plus");
    console.log(`\n🎯 Memory bank ready at: ${finalPath}`);
  }

  async migrateToHidden(currentPath: string): Promise<void> {
    console.log("🔄 Migrating to hidden directory...");

    const resolvedPath = path.resolve(currentPath);
    const parentDir = path.dirname(resolvedPath);
    const currentName = path.basename(resolvedPath);

    if (currentName.startsWith(".")) {
      console.log("✅ Already using hidden directory convention");
      return;
    }

    const hiddenPath = path.join(parentDir, `.${currentName}`);

    if (await fs.pathExists(hiddenPath)) {
      console.error(`❌ Hidden directory already exists: ${hiddenPath}`);
      return;
    }

    // Copy to hidden location
    await fs.copy(resolvedPath, hiddenPath);
    console.log(`✅ Migrated to hidden directory: ${hiddenPath}`);

    console.log("📋 Update your configuration:");
    console.log(`   export MEMORY_BANK_ROOT="${hiddenPath}"`);
    console.log(
      "\n⚠️  You can safely remove the old directory after verifying the migration",
    );
    console.log(`   rm -rf "${resolvedPath}"`);
  }

  async setupQdrant(): Promise<void> {
    console.log("🐳 Setting up Qdrant vector database...");

    // Check if Docker is available
    try {
      await this.runCommand("docker", ["--version"]);
    } catch {
      console.error("❌ Docker not found. Please install Docker first.");
      return;
    }

    // Check if Qdrant is already running
    try {
      const response = await fetch("http://localhost:6333/collections");
      if (response.ok) {
        console.log("✅ Qdrant already running on port 6333");
        return;
      }
    } catch {
      // Qdrant not running, start it
    }

    console.log("Starting Qdrant container...");
    try {
      await this.runCommand("docker", [
        "run",
        "-d",
        "--name",
        "qdrant-memory-bank",
        "-p",
        "6333:6333",
        "qdrant/qdrant",
      ]);

      // Wait for Qdrant to be ready
      console.log("⏳ Waiting for Qdrant to start...");
      await this.waitForQdrant();
      console.log("✅ Qdrant started successfully");
    } catch (error) {
      console.error(`❌ Failed to start Qdrant: ${error}`);
      console.log("💡 Try manually: docker run -d -p 6333:6333 qdrant/qdrant");
    }
  }

  async validateSetup(memoryBankPath?: string): Promise<void> {
    console.log("🔍 Validating memory bank setup...");

    const rootPath =
      memoryBankPath || process.env.MEMORY_BANK_ROOT || "./.memory_bank";
    let issues = 0;

    // Check memory bank directory
    if (await fs.pathExists(rootPath)) {
      console.log(`✅ Memory bank directory exists: ${rootPath}`);
    } else {
      console.log(`❌ Memory bank directory not found: ${rootPath}`);
      issues++;
    }

    // Check Qdrant connection
    try {
      const response = await fetch("http://localhost:6333/collections");
      if (response.ok) {
        console.log("✅ Qdrant connection successful");
      } else {
        console.log("❌ Qdrant connection failed");
        issues++;
      }
    } catch {
      console.log("❌ Qdrant not accessible on localhost:6333");
      issues++;
    }

    // Check global project
    const globalPath = path.join(rootPath, ".__global__");
    if (await fs.pathExists(globalPath)) {
      console.log("✅ Global memory project found");
    } else {
      console.log("⚠️  Global memory project not found (optional)");
    }

    // Summary
    if (issues === 0) {
      console.log("\n🎉 Memory bank setup is valid and ready!");
    } else {
      console.log(`\n⚠️  Found ${issues} issue(s) that need attention`);
      console.log("Run 'npm run setup:init' to fix common issues");
    }
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: "inherit" });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  private async waitForQdrant(maxWaitTime = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch("http://localhost:6333/collections");
        if (response.ok) {
          return;
        }
      } catch {
        // Still starting up
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("Qdrant failed to start within timeout");
  }
}

// CLI interface
const program = new Command();
const setup = new MemoryBankSetup();

program
  .name("setup-memory-bank")
  .description("Memory Bank Plus setup utility")
  .version("1.0.0");

program
  .command("init [path]")
  .description("Initialize a new memory bank")
  .option("-h, --hidden", "Create as hidden directory (.memory_bank)")
  .option("-g, --global", "Include global memory project")
  .option("-q, --qdrant-url <url>", "Qdrant URL", "http://localhost:6333")
  .option("-f, --force", "Overwrite existing directory")
  .action(async (targetPath = ".memory_bank", options) => {
    await setup.initializeMemoryBank(targetPath, options);
  });

program
  .command("migrate <current-path>")
  .description("Migrate existing memory bank to hidden directory")
  .action(async (currentPath) => {
    await setup.migrateToHidden(currentPath);
  });

program
  .command("setup-qdrant")
  .description("Set up Qdrant vector database")
  .action(async () => {
    await setup.setupQdrant();
  });

program
  .command("validate [path]")
  .description("Validate memory bank setup")
  .action(async (memoryBankPath) => {
    await setup.validateSetup(memoryBankPath);
  });

program
  .command("doctor")
  .description("Diagnose and fix common setup issues")
  .action(async () => {
    console.log("🩺 Running memory bank diagnostics...");
    await setup.validateSetup();
    await setup.setupQdrant();
    console.log("✅ Diagnostics complete");
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { MemoryBankSetup };

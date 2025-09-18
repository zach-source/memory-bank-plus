import fs from "fs-extra";
import path from "path";

export interface GitIgnoreRule {
  pattern: string;
  isNegation: boolean;
  isDirectory: boolean;
}

export class GitIgnoreProtectionService {
  private gitignoreCache = new Map<string, GitIgnoreRule[]>();

  /**
   * Check if a file should be ignored based on .gitignore rules
   */
  async shouldIgnoreFile(filePath: string): Promise<boolean> {
    const absolutePath = path.resolve(filePath);
    const rules = await this.getGitIgnoreRules(absolutePath);

    if (rules.length === 0) return false;

    // Get relative path from git root
    const gitRoot = await this.findGitRoot(absolutePath);
    if (!gitRoot) return false;

    const relativePath = path.relative(gitRoot, absolutePath);

    return this.matchesGitIgnoreRules(relativePath, rules);
  }

  /**
   * Check if a directory should be ignored
   */
  async shouldIgnoreDirectory(dirPath: string): Promise<boolean> {
    const absolutePath = path.resolve(dirPath);
    const rules = await this.getGitIgnoreRules(absolutePath);

    if (rules.length === 0) return false;

    const gitRoot = await this.findGitRoot(absolutePath);
    if (!gitRoot) return false;

    const relativePath = path.relative(gitRoot, absolutePath);

    return this.matchesGitIgnoreRules(relativePath + "/", rules);
  }

  /**
   * Get all files in a directory that are not git ignored
   */
  async getUntrackedFiles(dirPath: string): Promise<string[]> {
    const files = await this.getAllFiles(dirPath);
    const untrackedFiles: string[] = [];

    for (const file of files) {
      const ignored = await this.shouldIgnoreFile(file);
      if (!ignored) {
        untrackedFiles.push(file);
      }
    }

    return untrackedFiles;
  }

  /**
   * Validate that memory bank operations don't access ignored files
   */
  async validateMemoryBankPath(memoryBankPath: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if memory bank path itself is ignored
    const isIgnored = await this.shouldIgnoreDirectory(memoryBankPath);
    if (isIgnored) {
      issues.push(
        "Memory bank path is in .gitignore - data may not be tracked",
      );
      recommendations.push(
        "Move memory bank outside ignored directories or add exception",
      );
    }

    // Check if memory bank is inside .git directory
    if (memoryBankPath.includes("/.git/")) {
      issues.push("Memory bank inside .git directory - not recommended");
      recommendations.push("Use separate directory outside .git");
    }

    // Check if using hidden directory convention
    const dirname = path.basename(memoryBankPath);
    if (!dirname.startsWith(".") && dirname.includes("memory")) {
      recommendations.push(
        "Consider using hidden directory (.memory_bank) to avoid clutter",
      );
    }

    // Check for potential conflicts with build artifacts
    const problematicNames = ["node_modules", "dist", "build", "target", "out"];
    if (problematicNames.some((name) => memoryBankPath.includes(`/${name}/`))) {
      issues.push("Memory bank path conflicts with build directories");
      recommendations.push("Use dedicated directory outside build paths");
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  private async getGitIgnoreRules(filePath: string): Promise<GitIgnoreRule[]> {
    const gitRoot = await this.findGitRoot(filePath);
    if (!gitRoot) return [];

    const gitignorePath = path.join(gitRoot, ".gitignore");

    // Use cache to avoid re-reading .gitignore
    if (this.gitignoreCache.has(gitignorePath)) {
      return this.gitignoreCache.get(gitignorePath)!;
    }

    const rules = await this.parseGitIgnoreFile(gitignorePath);
    this.gitignoreCache.set(gitignorePath, rules);

    return rules;
  }

  private async parseGitIgnoreFile(
    gitignorePath: string,
  ): Promise<GitIgnoreRule[]> {
    const rules: GitIgnoreRule[] = [];

    try {
      const content = await fs.readFile(gitignorePath, "utf-8");
      const lines = content.split("\n");

      for (let line of lines) {
        line = line.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith("#")) continue;

        const isNegation = line.startsWith("!");
        if (isNegation) {
          line = line.substring(1);
        }

        const isDirectory = line.endsWith("/");
        if (isDirectory) {
          line = line.substring(0, line.length - 1);
        }

        rules.push({
          pattern: line,
          isNegation,
          isDirectory,
        });
      }
    } catch (error) {
      // .gitignore doesn't exist or can't be read
      console.debug("Could not read .gitignore:", error);
    }

    return rules;
  }

  private async findGitRoot(startPath: string): Promise<string | null> {
    let currentPath = path.resolve(startPath);

    while (currentPath !== path.dirname(currentPath)) {
      const gitPath = path.join(currentPath, ".git");

      try {
        const stat = await fs.stat(gitPath);
        if (stat.isDirectory()) {
          return currentPath;
        }
      } catch {
        // .git doesn't exist at this level
      }

      currentPath = path.dirname(currentPath);
    }

    return null;
  }

  private matchesGitIgnoreRules(
    relativePath: string,
    rules: GitIgnoreRule[],
  ): boolean {
    let isIgnored = false;

    for (const rule of rules) {
      const matches = this.matchesPattern(relativePath, rule);

      if (matches) {
        if (rule.isNegation) {
          isIgnored = false; // Negation rules override previous ignore
        } else {
          isIgnored = true;
        }
      }
    }

    return isIgnored;
  }

  private matchesPattern(filePath: string, rule: GitIgnoreRule): boolean {
    const { pattern, isDirectory } = rule;

    // Handle directory-specific patterns
    if (isDirectory) {
      // Check if any parent directory matches the pattern
      const parts = filePath.split("/");
      for (let i = 0; i < parts.length; i++) {
        const dirPath = parts.slice(0, i + 1).join("/");
        if (this.simpleMatch(dirPath, pattern)) {
          return true;
        }
      }
      return false;
    }

    // Handle file patterns
    return this.simpleMatch(filePath, pattern);
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.debug("Error reading directory:", dirPath, error);
    }

    return files;
  }

  /**
   * Simple pattern matching for gitignore rules
   * Supports basic wildcards (* and ?) without full minimatch complexity
   */
  private simpleMatch(text: string, pattern: string): boolean {
    // Convert gitignore pattern to regex
    const regexPattern = pattern
      .replace(/\./g, "\\.") // Escape dots
      .replace(/\*/g, ".*") // * matches any characters
      .replace(/\?/g, "."); // ? matches single character

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  }
}

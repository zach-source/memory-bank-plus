import matter from "gray-matter";
import { FileContent, FileMetadata } from "../../domain/entities/index.js";

export class YamlFrontMatterParser {
  /**
   * Parses a file's content and extracts YAML front-matter metadata
   */
  static parse(content: string): FileContent {
    try {
      const parsed = matter(content);
      
      const frontMatter: Partial<FileMetadata> = {};
      
      // Parse known fields
      if (parsed.data.tags) {
        frontMatter.tags = Array.isArray(parsed.data.tags) 
          ? parsed.data.tags 
          : [parsed.data.tags];
      } else {
        frontMatter.tags = [];
      }
      
      if (parsed.data.updated) {
        frontMatter.updated = new Date(parsed.data.updated);
      } else {
        frontMatter.updated = new Date();
      }
      
      if (parsed.data.created) {
        frontMatter.created = new Date(parsed.data.created);
      } else {
        frontMatter.created = new Date();
      }
      
      if (parsed.data.task) {
        frontMatter.task = parsed.data.task;
      }
      
      if (parsed.data.salience !== undefined) {
        const salience = parseFloat(parsed.data.salience);
        if (!isNaN(salience) && salience >= 0 && salience <= 1) {
          frontMatter.salience = salience;
        }
      }
      
      if (parsed.data.frequency !== undefined) {
        const frequency = parseInt(parsed.data.frequency);
        if (!isNaN(frequency) && frequency >= 0) {
          frontMatter.frequency = frequency;
        }
      }
      
      if (parsed.data.lastAccessed) {
        frontMatter.lastAccessed = new Date(parsed.data.lastAccessed);
      }

      return {
        frontMatter: frontMatter as FileMetadata,
        content: parsed.content,
      };
    } catch (error) {
      console.warn("Failed to parse YAML front-matter:", error);
      
      // Return content without front-matter if parsing fails
      return {
        content,
        frontMatter: {
          tags: [],
          updated: new Date(),
          created: new Date(),
        },
      };
    }
  }

  /**
   * Serializes file content with YAML front-matter
   */
  static serialize(fileContent: FileContent): string {
    const { frontMatter, content } = fileContent;
    
    if (!frontMatter) {
      return content;
    }

    const data: Record<string, any> = {};
    
    if (frontMatter.tags && frontMatter.tags.length > 0) {
      data.tags = frontMatter.tags;
    }
    
    if (frontMatter.updated) {
      data.updated = frontMatter.updated.toISOString();
    }
    
    if (frontMatter.created) {
      data.created = frontMatter.created.toISOString();
    }
    
    if (frontMatter.task) {
      data.task = frontMatter.task;
    }
    
    if (frontMatter.salience !== undefined) {
      data.salience = frontMatter.salience;
    }
    
    if (frontMatter.frequency !== undefined) {
      data.frequency = frontMatter.frequency;
    }
    
    if (frontMatter.lastAccessed) {
      data.lastAccessed = frontMatter.lastAccessed.toISOString();
    }

    try {
      return matter.stringify(content, data);
    } catch (error) {
      console.warn("Failed to serialize YAML front-matter:", error);
      return content;
    }
  }

  /**
   * Checks if content has YAML front-matter
   */
  static hasFrontMatter(content: string): boolean {
    return content.trim().startsWith("---");
  }

  /**
   * Updates existing front-matter with new metadata
   */
  static updateMetadata(content: string, newMetadata: Partial<FileMetadata>): string {
    const parsed = this.parse(content);
    
    const updatedMetadata: FileMetadata = {
      tags: [],
      updated: new Date(),
      created: new Date(),
      ...parsed.frontMatter,
      ...newMetadata,
    };

    return this.serialize({
      content: parsed.content,
      frontMatter: updatedMetadata,
    });
  }
}
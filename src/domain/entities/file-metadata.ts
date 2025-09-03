export interface FileMetadata {
  tags: string[];
  updated: Date;
  created: Date;
  task?: string;
  salience?: number;
  frequency?: number;
  lastAccessed?: Date;
}

export interface FileContent {
  frontMatter?: FileMetadata;
  content: string;
}

export interface EnhancedFile {
  name: string;
  projectName: string;
  content: string;
  metadata: FileMetadata;
  embedding?: Float32Array;
  contentHash?: string;
}
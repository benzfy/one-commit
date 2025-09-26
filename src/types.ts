export interface Config {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  language?: 'en' | 'zh';
}

export interface GitDiff {
  files: string[];
  additions: number;
  deletions: number;
  content: string;
}

export interface CommitOptions {
  message: string;
  addAll: boolean;
}
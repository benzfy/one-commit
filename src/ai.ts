import OpenAI from 'openai';
import { getConfig } from './config.js';
import { GitDiff, Config } from './types.js';

// Simple token estimation (roughly 4 characters per token for English text)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ProcessedDiff {
  content: string;
  wasTruncated: boolean;
  warnings: string[];
}

function processDiffContent(diffContent: string): ProcessedDiff {
  const MAX_TOKENS = 50000;
  const MAX_LINES_PER_FILE = 2000;
  const FALLBACK_LINES_PER_FILE = 20;
  
  let warnings: string[] = [];
  let wasTruncated = false;
  
  // Split diff into files (assuming diff format starts with diff --git)
  const fileSections = diffContent.split(/(?=^diff --git)/m).filter(Boolean);
  
  if (fileSections.length === 0) {
    return { content: diffContent, wasTruncated: false, warnings: [] };
  }
  
  // First pass: apply per-file line limits
  let processedSections = fileSections.map(section => {
    const lines = section.split('\n');
    if (lines.length > MAX_LINES_PER_FILE) {
      wasTruncated = true;
      const fileName = extractFileName(section);
      warnings.push(`File ${fileName}: truncated to ${MAX_LINES_PER_FILE} lines (original: ${lines.length} lines)`);
      return lines.slice(0, MAX_LINES_PER_FILE).join('\n');
    }
    return section;
  });
  
  let combinedContent = processedSections.join('\n');
  let estimatedTokens = estimateTokens(combinedContent);
  
  // Second pass: if still too many tokens, compress to summary format
  if (estimatedTokens > MAX_TOKENS) {
    wasTruncated = true;
    warnings.push(`Diff too large (${estimatedTokens} tokens), compressing to summary format`);
    
    processedSections = fileSections.map(section => {
      const fileName = extractFileName(section);
      const lines = section.split('\n');
      const diffLines = lines.filter(line => line.startsWith('+') || line.startsWith('-'));
      const additionsCount = lines.filter(line => line.startsWith('+')).length;
      const deletionsCount = lines.filter(line => line.startsWith('-')).length;
      
      // Show file info + first 20 lines of diff
      const headerLines = lines.slice(0, Math.min(5, lines.length)); // Git headers
      const diffPreview = lines.filter(line => 
        line.startsWith('+') || line.startsWith('-') || line.startsWith('@@')
      ).slice(0, FALLBACK_LINES_PER_FILE);
      
      return [
        `File: ${fileName} (+${additionsCount} -${deletionsCount} lines)`,
        ...headerLines,
        ...diffPreview,
        diffPreview.length >= FALLBACK_LINES_PER_FILE ? '... (diff truncated)' : ''
      ].filter(Boolean).join('\n');
    });
    
    combinedContent = processedSections.join('\n\n');
    estimatedTokens = estimateTokens(combinedContent);
    
    // Final fallback: hard truncate if still too large
    if (estimatedTokens > MAX_TOKENS) {
      const maxChars = MAX_TOKENS * 4; // Convert tokens back to approximate characters
      combinedContent = combinedContent.slice(0, maxChars);
      warnings.push(`Content truncated to ${MAX_TOKENS} tokens limit`);
    }
  }
  
  return {
    content: combinedContent,
    wasTruncated,
    warnings
  };
}

function extractFileName(diffSection: string): string {
  const match = diffSection.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
  return match ? match[2] : 'unknown file';
}

function createSystemPrompt(language: 'en' | 'zh', diff: GitDiff): string {
  const isLargeChange = diff.files.length > 10 || diff.additions + diff.deletions > 500;
  
  if (language === 'zh') {
    return `你是一个专业的开发者，能够按照 Conventional Commits 规范编写精确的提交消息。

必须格式：<type>[可选scope]: <description>

类型（选择最合适的）：
- feat: 新功能
- fix: 修复错误
- docs: 文档变更
- style: 代码格式（不影响代码运行的变动）
- refactor: 重构（既不新增功能，也不修复错误）
- test: 增加测试
- chore: 构建过程或辅助工具的变动
- perf: 性能优化
- ci: 持续集成相关
- build: 构建系统或外部依赖的变动
- revert: 回滚之前的提交

作用域（可选但推荐）：
- 使用括号：feat(auth): 或 fix(api):
- 常用作用域：api, ui, auth, db, config, deps, core, utils
- 如果变更影响多个模块则省略

描述规则：
- 使用动宾形式："增加"而非"增加了"或"增加中"
- 冒号后不要大写
- 结尾不加句号
- 50个字符以内
- 描述做了什么以及为什么，不是怎么做的

${isLargeChange ? '由于这是一个较大的变更，请写一个概括性的提交消息，突出主要目的。' : ''}

示例：
✅ feat(auth): 添加JWT令牌验证
✅ fix(api): 修复用户服务空指针异常
✅ docs(readme): 更新安装说明
✅ refactor(utils): 简化日期格式化逻辑
✅ style: 使用prettier格式化代码
✅ test(auth): 添加登录流程单元测试
✅ chore(deps): 更新react到v18.2.0

只回复符合上述格式的提交消息。`;
  }
  
  // English system prompt
  return `You are an expert developer who writes precise Conventional Commits format messages.

MANDATORY FORMAT: <type>[optional scope]: <description>

TYPES (choose the most appropriate):
- feat: new feature for the user
- fix: bug fix for the user  
- docs: documentation changes
- style: formatting, missing semicolons, etc (no code change)
- refactor: refactoring production code (no new features or fixes)
- test: adding/updating tests (no production code change)
- chore: build process, dependencies, tooling, etc (no production code change)
- perf: performance improvements
- ci: continuous integration changes
- build: build system or dependencies changes
- revert: reverting a previous commit

SCOPE (optional but recommended):
- Use parentheses: feat(auth): or fix(api):
- Common scopes: api, ui, auth, db, config, deps, core, utils
- Omit if change affects multiple areas

DESCRIPTION RULES:
- Use imperative mood: "add" not "added" or "adds"
- No capital letter after colon
- No period at the end
- 50 characters or less
- Describe WHAT and WHY, not HOW

${isLargeChange ? 'This is a large change - write a high-level commit message that captures the main purpose.' : ''}

EXAMPLES:
✅ feat(auth): add JWT token validation
✅ fix(api): resolve null pointer in user service
✅ docs(readme): update installation instructions  
✅ refactor(utils): simplify date formatting logic
✅ style: format code with prettier
✅ test(auth): add unit tests for login flow
✅ chore(deps): update react to v18.2.0
✅ perf(db): optimize user query performance
✅ ci: add automated testing pipeline

❌ Add new feature (missing type)
❌ feat: Added new feature (past tense)
❌ feat: add new feature. (period at end)
❌ fix: Fix the bug in UserService.java (past tense + filename)

Respond with ONLY the commit message in the exact format above.`;
}

export async function generateCommitMessage(diff: GitDiff): Promise<{ message: string; warnings: string[] }> {
  const config = getConfig();
  
  if (!config.apiKey) {
    throw new Error('OpenAI API key not configured. Please run with --config to set it up.');
  }

  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });

  const { prompt, warnings } = createCommitPrompt(diff, config);

  try {
    const completion = await openai.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: createSystemPrompt(config.language || 'en', diff),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const message = completion.choices[0]?.message?.content?.trim();
    if (!message) {
      throw new Error('Failed to generate commit message');
    }

    return { message, warnings };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating commit message');
  }
}

interface FileAnalysis {
  categories: { name: string; files: string[] }[];
  suggestedType: string;
  suggestedScope: string;
  changePattern: string;
}

function analyzeChangedFiles(files: string[]): FileAnalysis {
  const categories: { name: string; files: string[] }[] = [];
  
  // Categorize files
  const testFiles = files.filter(f => /\.(test|spec)\.(js|ts|jsx|tsx)$|\/tests?\//.test(f));
  const docFiles = files.filter(f => /\.(md|txt|rst)$|\/docs?\//i.test(f));
  const configFiles = files.filter(f => /(package\.json|tsconfig|webpack|babel|eslint|prettier|vite|rollup)/.test(f));
  const sourceFiles = files.filter(f => /\.(js|ts|jsx|tsx|py|java|cpp|c|go|rs|php)$/.test(f) && !testFiles.includes(f));
  const styleFiles = files.filter(f => /\.(css|scss|sass|less|styl)$/.test(f));
  const buildFiles = files.filter(f => /(dockerfile|makefile|\.yml|\.yaml|\.toml|\.ini)$/i.test(f));
  
  if (testFiles.length > 0) categories.push({ name: 'Tests', files: testFiles });
  if (docFiles.length > 0) categories.push({ name: 'Documentation', files: docFiles });
  if (configFiles.length > 0) categories.push({ name: 'Configuration', files: configFiles });
  if (sourceFiles.length > 0) categories.push({ name: 'Source Code', files: sourceFiles });
  if (styleFiles.length > 0) categories.push({ name: 'Styles', files: styleFiles });
  if (buildFiles.length > 0) categories.push({ name: 'Build/Deploy', files: buildFiles });
  
  // Determine suggested type
  let suggestedType = 'feat';
  if (testFiles.length > 0 && sourceFiles.length === 0) {
    suggestedType = 'test';
  } else if (docFiles.length > 0 && sourceFiles.length === 0) {
    suggestedType = 'docs';
  } else if (configFiles.length > 0 && sourceFiles.length === 0) {
    suggestedType = 'chore';
  } else if (styleFiles.length > 0 && sourceFiles.length === 0) {
    suggestedType = 'style';
  } else if (buildFiles.length > 0 && sourceFiles.length === 0) {
    suggestedType = 'ci';
  }
  
  // Determine suggested scope
  let suggestedScope = '';
  if (configFiles.some(f => f.includes('package.json'))) {
    suggestedScope = 'deps';
  } else if (files.some(f => /\/api\/|\/server\//.test(f))) {
    suggestedScope = 'api';
  } else if (files.some(f => /\/ui\/|\/components?\/|\/frontend\//.test(f))) {
    suggestedScope = 'ui';
  } else if (files.some(f => /\/auth\/|\/login\/|\/security\//.test(f))) {
    suggestedScope = 'auth';
  } else if (files.some(f => /\/db\/|\/database\/|\/models?\//.test(f))) {
    suggestedScope = 'db';
  } else if (files.some(f => /\/utils?\/|\/helpers?\//.test(f))) {
    suggestedScope = 'utils';
  } else if (files.some(f => /\/core\/|\/lib\//.test(f))) {
    suggestedScope = 'core';
  }
  
  // Determine change pattern
  let changePattern = 'mixed changes';
  if (categories.length === 1) {
    const category = categories[0];
    if (category.name === 'Tests') {
      changePattern = 'test additions/updates';
    } else if (category.name === 'Documentation') {
      changePattern = 'documentation updates';
    } else if (category.name === 'Configuration') {
      changePattern = 'configuration changes';
    } else if (category.name === 'Source Code') {
      changePattern = 'source code modifications';
    }
  } else if (testFiles.length > 0 && sourceFiles.length > 0) {
    changePattern = 'feature with tests';
  } else if (configFiles.length > 0 && sourceFiles.length === 0) {
    changePattern = 'configuration only';
  }
  
  return {
    categories,
    suggestedType,
    suggestedScope,
    changePattern
  };
}

function createCommitPrompt(diff: GitDiff, config: Config): { prompt: string; warnings: string[] } {
  const { files, additions, deletions, content } = diff;

  const processed = processDiffContent(content);

  // Analyze file changes to suggest scope and type
  const fileAnalysis = analyzeChangedFiles(files);
  const isLargeChange = files.length > 10 || additions + deletions > 500;
  const language = config.language || 'en';
  
  let prompt: string;
  
  if (language === 'zh') {
    prompt = `分析以下代码变更并生成符合 Conventional Commits 规范的提交消息：

变更摘要：
- 变更文件数：${files.length}
- 新增行数：+${additions}
- 删除行数：-${deletions}

文件分类：
${fileAnalysis.categories.map(cat => `- ${cat.name}: ${cat.files.join(', ')}`).join('\n')}

建议上下文：
- 推荐类型：${fileAnalysis.suggestedType}
- 推荐作用域：${fileAnalysis.suggestedScope}
- 变更模式：${fileAnalysis.changePattern}

变更文件：
${files.map(f => `- ${f}`).join('\n')}

${isLargeChange ? '' : `GIT DIFF:
\`\`\`diff
${processed.content}
\`\`\``}`;
  } else {
    prompt = `Analyze the following code changes and generate a Conventional Commits message:

CHANGE SUMMARY:
- Files changed: ${files.length}
- Lines added: +${additions}
- Lines deleted: -${deletions}

FILES BY CATEGORY:
${fileAnalysis.categories.map(cat => `- ${cat.name}: ${cat.files.join(', ')}`).join('\n')}

SUGGESTED CONTEXT:
- Likely type: ${fileAnalysis.suggestedType}
- Likely scope: ${fileAnalysis.suggestedScope}
- Change pattern: ${fileAnalysis.changePattern}

CHANGED FILES:
${files.map(f => `- ${f}`).join('\n')}

${isLargeChange ? '' : `GIT DIFF:
\`\`\`diff
${processed.content}
\`\`\``}`;
  }

  if (processed.wasTruncated) {
    const warningText = language === 'zh' ? 
      '\n\n⚠️ 注意：由于大小限制，diff内容已被截断 - 请关注文件模式和变更类型。' :
      '\n\n⚠️ Note: Diff content truncated due to size limits - focus on file patterns and change types.';
    prompt += warningText;
  }

  const finalInstructionText = language === 'zh' ?
    '\n\n生成一个准确反映这些变更主要目的的 Conventional Commits 提交消息。' :
    '\n\nGenerate a Conventional Commits message that accurately reflects the primary purpose of these changes.';
  prompt += finalInstructionText;

  return { prompt, warnings: processed.warnings };
}
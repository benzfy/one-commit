import { execa } from 'execa';
import { GitDiff } from './types.js';

export async function isGitRepository(): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

export async function hasChanges(): Promise<boolean> {
  try {
    const { stdout: stagedChanges } = await execa('git', ['diff', '--cached', '--name-only']);
    const { stdout: unstagedChanges } = await execa('git', ['diff', '--name-only']);
    const { stdout: untrackedFiles } = await execa('git', ['ls-files', '--others', '--exclude-standard']);
    return stagedChanges.trim().length > 0 || unstagedChanges.trim().length > 0 || untrackedFiles.trim().length > 0;
  } catch {
    return false;
  }
}

export async function getStagedChanges(): Promise<GitDiff> {
  try {
    const { stdout: files } = await execa('git', ['diff', '--cached', '--name-only']);
    const { stdout: stats } = await execa('git', ['diff', '--cached', '--numstat']);
    const { stdout: content } = await execa('git', ['diff', '--cached']);

    const fileList = files.trim().split('\n').filter(Boolean);
    
    let additions = 0;
    let deletions = 0;
    
    if (stats.trim()) {
      stats.trim().split('\n').forEach(line => {
        const [add, del] = line.split('\t');
        if (add !== '-') additions += parseInt(add, 10);
        if (del !== '-') deletions += parseInt(del, 10);
      });
    }

    return {
      files: fileList,
      additions,
      deletions,
      content: content.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to get staged changes: ${error}`);
  }
}

export async function getAllChanges(): Promise<GitDiff> {
  try {
    const { stdout: files } = await execa('git', ['diff', 'HEAD', '--name-only']);
    const { stdout: stats } = await execa('git', ['diff', 'HEAD', '--numstat']);
    const { stdout: content } = await execa('git', ['diff', 'HEAD']);

    const fileList = files.trim().split('\n').filter(Boolean);
    
    let additions = 0;
    let deletions = 0;
    
    if (stats.trim()) {
      stats.trim().split('\n').forEach(line => {
        const [add, del] = line.split('\t');
        if (add !== '-') additions += parseInt(add, 10);
        if (del !== '-') deletions += parseInt(del, 10);
      });
    }

    return {
      files: fileList,
      additions,
      deletions,
      content: content.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to get all changes: ${error}`);
  }
}

export async function stageAllChanges(): Promise<void> {
  try {
    await execa('git', ['add', '.']);
  } catch (error) {
    throw new Error(`Failed to stage changes: ${error}`);
  }
}

export async function commit(message: string): Promise<void> {
  try {
    await execa('git', ['commit', '-m', message]);
  } catch (error) {
    throw new Error(`Failed to commit: ${error}`);
  }
}

export async function getUnstagedChanges(): Promise<GitDiff> {
  try {
    const { stdout: files } = await execa('git', ['diff', '--name-only']);
    const { stdout: stats } = await execa('git', ['diff', '--numstat']);
    const { stdout: content } = await execa('git', ['diff']);

    const fileList = files.trim().split('\n').filter(Boolean);
    
    let additions = 0;
    let deletions = 0;
    
    if (stats.trim()) {
      stats.trim().split('\n').forEach(line => {
        const [add, del] = line.split('\t');
        if (add !== '-') additions += parseInt(add, 10);
        if (del !== '-') deletions += parseInt(del, 10);
      });
    }

    return {
      files: fileList,
      additions,
      deletions,
      content: content.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to get unstaged changes: ${error}`);
  }
}

export async function getUntrackedFiles(): Promise<string[]> {
  try {
    const { stdout } = await execa('git', ['ls-files', '--others', '--exclude-standard']);
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    throw new Error(`Failed to get untracked files: ${error}`);
  }
}

export async function getAllUnstagedFiles(): Promise<{
  modified: string[];
  untracked: string[];
}> {
  try {
    const { stdout: modified } = await execa('git', ['diff', '--name-only']);
    const { stdout: untracked } = await execa('git', ['ls-files', '--others', '--exclude-standard']);
    
    return {
      modified: modified.trim().split('\n').filter(Boolean),
      untracked: untracked.trim().split('\n').filter(Boolean),
    };
  } catch (error) {
    throw new Error(`Failed to get unstaged files: ${error}`);
  }
}

export async function stageFiles(files: string[]): Promise<void> {
  try {
    if (files.length === 0) return;
    await execa('git', ['add', ...files]);
  } catch (error) {
    throw new Error(`Failed to stage files: ${error}`);
  }
}

export async function resetStagedFiles(): Promise<void> {
  try {
    // First check if HEAD exists (i.e., if there's at least one commit)
    try {
      await execa('git', ['rev-parse', '--verify', 'HEAD']);
      // HEAD exists, use normal reset
      await execa('git', ['reset', 'HEAD']);
    } catch {
      // HEAD doesn't exist (new repository), use git reset without HEAD
      await execa('git', ['reset']);
    }
  } catch (error) {
    throw new Error(`Failed to reset staged files: ${error}`);
  }
}
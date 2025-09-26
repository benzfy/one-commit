#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Text, Box, Spacer, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { Command } from 'commander';
import chalk from 'chalk';
import * as git from './git.js';
import * as ai from './ai.js';
import { getConfig, setConfig, hasValidConfig } from './config.js';
import { GitDiff } from './types.js';

interface AppProps {
  config?: boolean;
}

interface ConfigSetupProps {
  onComplete: () => void;
}

interface CommitFlowProps {
  onExit: () => void;
}

interface FileSelectProps {
  files: { modified: string[]; untracked: string[] };
  onSubmit: (selectedFiles: string[]) => void;
  onCancel: () => void;
}

// Helper functions for virtual scrolling
const getTerminalHeight = (): number => {
  return process.stdout.rows || 24;
};

const getVisibleRange = (selectedIndex: number, totalFiles: number, maxVisible: number) => {
  if (totalFiles <= maxVisible) {
    return { start: 0, end: totalFiles };
  }
  
  const halfWindow = Math.floor(maxVisible / 2);
  let start = Math.max(0, selectedIndex - halfWindow);
  let end = Math.min(totalFiles, start + maxVisible);
  
  // Adjust window to utilize full space
  if (end - start < maxVisible) {
    start = Math.max(0, end - maxVisible);
  }
  
  return { start, end };
};

const FileSelector: React.FC<FileSelectProps> = ({ files, onSubmit, onCancel }) => {
  const [showAllNewFiles, setShowAllNewFiles] = useState(false);
  const visibleNewFiles = showAllNewFiles ? files.untracked : files.untracked.slice(0, 10);
  const allFiles = [...files.modified, ...visibleNewFiles];
  
  // Calculate display window
  const terminalHeight = getTerminalHeight();
  const reservedLines = 12; // Title, help text, stats, spacing, scroll indicator
  const maxVisibleFiles = Math.max(5, terminalHeight - reservedLines);
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Default to only modified files selected (exclude new files)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(files.modified));

  useInput((input, key) => {
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < allFiles.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (key.ctrl && input === 'a') {
      // Ctrl+A: Jump to beginning
      setSelectedIndex(0);
    } else if (key.ctrl && input === 'e') {
      // Ctrl+E: Jump to end
      setSelectedIndex(allFiles.length - 1);
    } else if (input === ' ') {
      // Toggle individual file
      const file = allFiles[selectedIndex];
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file)) {
        newSelected.delete(file);
      } else {
        newSelected.add(file);
      }
      setSelectedFiles(newSelected);
    } else if (input === 'a' || input === 'A') {
      // Select All hotkey (including all untracked files)
      const allAvailableFiles = [...files.modified, ...files.untracked];
      setSelectedFiles(new Set(allAvailableFiles));
    } else if (input === 'd' || input === 'D') {
      // Deselect All hotkey
      setSelectedFiles(new Set());
    } else if (input === 'm' || input === 'M') {
      // Toggle show more new files
      if (files.untracked.length > 10) {
        setShowAllNewFiles(!showAllNewFiles);
      }
    } else if (key.return) {
      if (selectedFiles.size > 0) {
        onSubmit(Array.from(selectedFiles));
      }
    } else if (key.escape || key.ctrl && input === 'c') {
      onCancel();
    }
  });

  // Calculate visible range for virtual scrolling
  const { start: visibleStart, end: visibleEnd } = getVisibleRange(selectedIndex, allFiles.length, maxVisibleFiles);
  const visibleFiles = allFiles.slice(visibleStart, visibleEnd);
  
  // Helper function to render a single file
  const renderFile = (file: string, index: number) => {
    const isSelected = selectedIndex === index;
    const isChecked = selectedFiles.has(file);
    const isModified = files.modified.includes(file);
    
    return (
      <Text key={file} color={isSelected ? 'blue' : 'white'}>
        {isSelected ? '❯ ' : '  '}
        {isChecked ? '[✓]' : '[ ]'}
        {isModified ? '📝' : '➕'} {file}
      </Text>
    );
  };

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>Select files to stage:</Text>
      <Text color="gray">Use ↑/↓ to navigate, space to select/deselect, enter to confirm</Text>
      <Text color="gray">Press 'a' to select all, 'd' to deselect all, Ctrl+A/E for start/end{files.untracked.length > 10 ? ", 'm' to show more new files" : ""}</Text>
      <Text></Text>
      
      {/* Scroll indicator */}
      {allFiles.length > maxVisibleFiles && (
        <>
          <Text color="gray">Showing {visibleStart + 1}-{visibleEnd} of {allFiles.length} files</Text>
          <Text></Text>
        </>
      )}
      
      {/* Render files with proper section headers */}
      {(() => {
        const elements: JSX.Element[] = [];
        let modifiedHeaderShown = false;
        let newFilesHeaderShown = false;
        
        visibleFiles.forEach((file, localIndex) => {
          const globalIndex = visibleStart + localIndex;
          const isModified = files.modified.includes(file);
          
          // Show "Modified files:" header before first modified file
          if (isModified && !modifiedHeaderShown && files.modified.length > 0) {
            elements.push(
              <Text key="modified-header" color="yellow" bold>Modified files:</Text>
            );
            modifiedHeaderShown = true;
          }
          
          // Show "New files:" header before first new file
          if (!isModified && !newFilesHeaderShown && files.untracked.length > 0) {
            if (modifiedHeaderShown) {
              elements.push(<Text key="spacing"></Text>);
            }
            elements.push(
              <Text key="new-files-header" color="green" bold>New files:</Text>
            );
            newFilesHeaderShown = true;
          }
          
          // Add the file
          elements.push(renderFile(file, globalIndex));
        });
        
        return elements;
      })()}
      
      {/* Show more new files indicator */}
      {files.untracked.length > 10 && !showAllNewFiles && visibleEnd >= files.modified.length + 10 && (
        <Text color="gray">
          ... and {files.untracked.length - 10} more new files (press 'm' to show all)
        </Text>
      )}
      
      <Text></Text>
      <Text color="gray">
        Selected: {selectedFiles.size}/{files.modified.length + files.untracked.length} file{selectedFiles.size !== 1 ? 's' : ''}
      </Text>
      <Text color="gray">Press ESC or Ctrl+C to cancel</Text>
    </Box>
  );
};

const ConfigSetup: React.FC<ConfigSetupProps> = ({ onComplete }) => {
  const existingConfig = getConfig();
  const hasExistingConfig = hasValidConfig();
  
  const [step, setStep] = useState<'menu' | 'api-key' | 'base-url' | 'model' | 'language' | 'done'>(
    hasExistingConfig ? 'menu' : 'api-key'
  );
  const [apiKey, setApiKey] = useState(existingConfig.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(existingConfig.baseUrl || 'https://api.openai.com/v1');
  const [model, setModel] = useState(existingConfig.model || 'gpt-4o-mini');
  const [language, setLanguage] = useState<'en' | 'zh'>(existingConfig.language || 'en');

  const handleMenuSelect = (item: { value: string }) => {
    if (item.value === 'api-key') {
      setStep('api-key');
    } else if (item.value === 'base-url') {
      setStep('base-url');
    } else if (item.value === 'model') {
      setStep('model');
    } else if (item.value === 'language') {
      setStep('language');
    } else if (item.value === 'done') {
      onComplete();
    }
  };

  const saveConfigAndFinish = () => {
    setConfig({
      apiKey,
      baseUrl,
      model,
      language,
    });
    
    setStep('done');
    setTimeout(onComplete, 1000);
  };

  const handleApiKeySubmit = (value: string) => {
    setApiKey(value);
    if (hasExistingConfig) {
      setConfig({
        apiKey: value,
        baseUrl,
        model,
        language,
      });
      onComplete();
    } else {
      setStep('base-url');
    }
  };

  const handleBaseUrlSubmit = (value: string) => {
    const newBaseUrl = value || 'https://api.openai.com/v1';
    setBaseUrl(newBaseUrl);
    if (hasExistingConfig) {
      setConfig({
        apiKey,
        baseUrl: newBaseUrl,
        model,
        language,
      });
      onComplete();
    } else {
      setStep('model');
    }
  };

  const handleModelSubmit = (value: string) => {
    const newModel = value || 'gpt-4o-mini';
    setModel(newModel);
    if (hasExistingConfig) {
      setConfig({
        apiKey,
        baseUrl,
        model: newModel,
        language,
      });
      onComplete();
    } else {
      setStep('language');
    }
  };

  const handleLanguageSelect = (item: { value: 'en' | 'zh' }) => {
    setLanguage(item.value);
    
    // Save config immediately with the new language value
    setConfig({
      apiKey,
      baseUrl,
      model,
      language: item.value, // Use the new value directly
    });
    
    onComplete();
  };

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>🛠️  One-Commit Configuration</Text>
      <Text></Text>
      
      {step === 'menu' && (
        <>
          <Text>Current configuration:</Text>
          <Text color="gray">API Key: {apiKey ? '***' + apiKey.slice(-4) : 'Not set'}</Text>
          <Text color="gray">Base URL: {baseUrl}</Text>
          <Text color="gray">Model: {model}</Text>
          <Text color="gray">Language: {language === 'zh' ? '🇨🇳 中文' : '🇺🇸 English'}</Text>
          <Text></Text>
          <Text>What would you like to modify?</Text>
          <SelectInput
            items={[
              { label: '🔑 Change API Key', value: 'api-key' },
              { label: '🌐 Change Base URL', value: 'base-url' },
              { label: '🤖 Change Model', value: 'model' },
              { label: '🌍 Change Language', value: 'language' },
              { label: '✅ Done', value: 'done' },
            ]}
            onSelect={handleMenuSelect}
          />
        </>
      )}
      
      {step === 'api-key' && (
        <>
          <Text>Enter your OpenAI API Key:</Text>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            onSubmit={handleApiKeySubmit}
            placeholder="sk-..."
            mask="*"
          />
        </>
      )}
      
      {step === 'base-url' && (
        <>
          <Text>Enter OpenAI Base URL (press Enter for default):</Text>
          <Text color="gray">Default: https://api.openai.com/v1</Text>
          <TextInput
            value={baseUrl}
            onChange={setBaseUrl}
            onSubmit={handleBaseUrlSubmit}
            placeholder="https://api.openai.com/v1"
          />
        </>
      )}
      
      {step === 'model' && (
        <>
          <Text>Enter model name (press Enter for default):</Text>
          <Text color="gray">Default: gpt-4o-mini</Text>
          <TextInput
            value={model}
            onChange={setModel}
            onSubmit={handleModelSubmit}
            placeholder="gpt-4o-mini"
          />
        </>
      )}
      
      {step === 'language' && (
        <>
          <Text>Select commit message language:</Text>
          <Text color="gray">Choose your preferred language for generated commit messages</Text>
          <SelectInput
            items={[
              { label: '🇺🇸 English', value: 'en' as const },
              { label: '🇨🇳 中文', value: 'zh' as const },
            ]}
            onSelect={handleLanguageSelect}
          />
        </>
      )}
      
      {step === 'done' && (
        <Text color="green">✅ Configuration saved!</Text>
      )}
    </Box>
  );
};

// Helper function to generate commit summary
const generateCommitSummary = (message: string, diff: GitDiff | null): string => {
  if (!diff) return '';
  
  const { files, additions, deletions } = diff;
  const filesChanged = files.length;
  
  let summary = `[${message}]\n`;
  summary += ` ${filesChanged} file${filesChanged !== 1 ? 's' : ''} changed`;
  
  if (additions > 0) {
    summary += `, ${additions} insertion${additions !== 1 ? 's' : ''}(+)`;
  }
  
  if (deletions > 0) {
    summary += `, ${deletions > 0 && additions > 0 ? '' : ' '}${deletions} deletion${deletions !== 1 ? 's' : ''}(-)`;
  }
  
  return summary;
};

const CommitFlow: React.FC<CommitFlowProps> = ({ onExit }) => {
  const [stage, setStage] = useState<'checking' | 'no-changes' | 'file-select' | 'stage-prompt' | 'generating' | 'review' | 'committing' | 'done' | 'error' | 'staged-reset'>('checking');
  const [error, setError] = useState<string>('');
  const [diff, setDiff] = useState<GitDiff | null>(null);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [availableFiles, setAvailableFiles] = useState<{ modified: string[]; untracked: string[]; }>({ modified: [], untracked: [] });
  const [selectedFilesList, setSelectedFilesList] = useState<string[]>([]);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [commitSummary, setCommitSummary] = useState<string>('');
  const [stagedFiles, setStagedFiles] = useState<GitDiff | null>(null);

  useEffect(() => {
    checkRepository();
  }, []);

  const checkRepository = async () => {
    try {
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        setError('Not a git repository');
        setStage('error');
        return;
      }

      const hasChanges = await git.hasChanges();
      if (!hasChanges) {
        setStage('no-changes');
        return;
      }

      const staged = await git.getStagedChanges();
      if (staged.files.length > 0) {
        setStagedFiles(staged);
        // Check if there are also unstaged files - might be accidental staging
        const unstagedFiles = await git.getAllUnstagedFiles();
        if (unstagedFiles.modified.length > 0 || unstagedFiles.untracked.length > 0) {
          // User might want to reset and reselect files
          setAvailableFiles(unstagedFiles);
          setStage('staged-reset');
        } else {
          // Only staged files, proceed normally
          setDiff(staged);
          generateCommitMessage(staged);
        }
      } else {
        // Check for unstaged files
        const unstagedFiles = await git.getAllUnstagedFiles();
        if (unstagedFiles.modified.length > 0 || unstagedFiles.untracked.length > 0) {
          setAvailableFiles(unstagedFiles);
          setStage('file-select');
        } else {
          setStage('no-changes');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStage('error');
    }
  };

  const handleFileSelection = async (selectedFiles: string[]) => {
    try {
      if (selectedFiles.length === 0) {
        setError('No files selected');
        setStage('error');
        return;
      }
      
      // Store selected files for later staging
      setSelectedFilesList(selectedFiles);
      
      // Generate diff for selected files without actually staging them
      await generateCommitMessageForFiles(selectedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process selected files');
      setStage('error');
    }
  };

  const handleFileSelectionCancel = () => {
    onExit();
  };

  const generateCommitMessageForFiles = async (selectedFiles: string[]) => {
    setStage('generating');
    try {
      // Temporarily stage selected files to get diff
      await git.stageFiles(selectedFiles);
      const tempDiff = await git.getStagedChanges();
      
      // Immediately unstage to avoid side effects
      await git.resetStagedFiles();
      
      // Generate commit message with the diff
      setDiff(tempDiff);
      const result = await ai.generateCommitMessage(tempDiff);
      setCommitMessage(result.message);
      setAiWarnings(result.warnings);
      setStage('review');
    } catch (err) {
      // Make sure to unstage in case of error
      try {
        await git.resetStagedFiles();
      } catch {
        // Ignore reset errors
      }
      setError(err instanceof Error ? err.message : 'Failed to generate commit message');
      setStage('error');
    }
  };

  const handleStageChoice = async (choice: { value: string }) => {
    if (choice.value === 'stage') {
      try {
        await git.stageAllChanges();
        const staged = await git.getStagedChanges();
        setDiff(staged);
        generateCommitMessage(staged);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to stage changes');
        setStage('error');
      }
    } else {
      onExit();
    }
  };

  const generateCommitMessage = async (diff: GitDiff) => {
    setStage('generating');
    try {
      const result = await ai.generateCommitMessage(diff);
      setCommitMessage(result.message);
      setAiWarnings(result.warnings);
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate commit message');
      setStage('error');
    }
  };

  const handleCommitChoice = async (choice: { value: string }) => {
    if (choice.value === 'commit') {
      setStage('committing');
      try {
        // Stage the selected files before committing
        if (selectedFilesList.length > 0) {
          await git.stageFiles(selectedFilesList);
        }
        await git.commit(commitMessage);
        
        // Generate commit summary
        const summary = generateCommitSummary(commitMessage, diff);
        setCommitSummary(summary);
        
        setStage('done');
        setTimeout(onExit, 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to commit');
        setStage('error');
      }
    } else if (choice.value === 'edit') {
      setCustomMessage(commitMessage);
    } else if (choice.value === 'regenerate') {
      if (selectedFilesList.length > 0) {
        await generateCommitMessageForFiles(selectedFilesList);
      } else if (diff) {
        generateCommitMessage(diff);
      }
    } else {
      onExit();
    }
  };

  const handleCustomMessageSubmit = async (message: string) => {
    if (!message.trim()) return;
    
    setStage('committing');
    try {
      // Stage the selected files before committing
      if (selectedFilesList.length > 0) {
        await git.stageFiles(selectedFilesList);
      }
      await git.commit(message);
      
      // Generate commit summary
      const summary = generateCommitSummary(message, diff);
      setCommitSummary(summary);
      
      setStage('done');
      setTimeout(onExit, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit');
      setStage('error');
    }
  };

  const handleStagedResetChoice = async (choice: { value: string }) => {
    if (choice.value === 'reset') {
      try {
        await git.resetStagedFiles();
        setStage('file-select');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reset staged files');
        setStage('error');
      }
    } else if (choice.value === 'continue') {
      const staged = await git.getStagedChanges();
      setDiff(staged);
      generateCommitMessage(staged);
    } else {
      onExit();
    }
  };

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>🚀 One-Commit</Text>
      <Text></Text>

      {stage === 'checking' && (
        <Text>
          <Spinner type="dots" /> Checking repository...
        </Text>
      )}

      {stage === 'no-changes' && (
        <Text color="yellow">No changes to commit</Text>
      )}

      {stage === 'file-select' && (
        <FileSelector
          files={availableFiles}
          onSubmit={handleFileSelection}
          onCancel={handleFileSelectionCancel}
        />
      )}

      {stage === 'staged-reset' && (
        <>
          <Text color="yellow">⚠️  Files already staged for commit:</Text>
          <Text></Text>
          {stagedFiles && (
            <>
              <Text color="gray">Staged files ({stagedFiles.files.length}):</Text>
              {stagedFiles.files.map(file => (
                <Text key={file} color="green">  ✓ {file}</Text>
              ))}
              <Text color="gray">Changes: +{stagedFiles.additions} -{stagedFiles.deletions}</Text>
              <Text></Text>
            </>
          )}
          <Text>What would you like to do?</Text>
          <SelectInput
            items={[
              { label: '✅ Continue with current staged files', value: 'continue' },
              { label: '🔄 Reset and select files manually', value: 'reset' },
              { label: '❌ Cancel', value: 'cancel' },
            ]}
            onSelect={handleStagedResetChoice}
          />
        </>
      )}

      {stage === 'stage-prompt' && (
        <>
          <Text>No staged changes found. Would you like to stage all changes?</Text>
          <SelectInput
            items={[
              { label: 'Stage all changes and continue', value: 'stage' },
              { label: 'Cancel', value: 'cancel' },
            ]}
            onSelect={handleStageChoice}
          />
        </>
      )}

      {stage === 'generating' && (
        <Text>
          <Spinner type="dots" /> Generating commit message...
        </Text>
      )}

      {stage === 'review' && (
        <>
          <Text color="green" bold>Generated commit message:</Text>
          <Box borderStyle="single" borderColor="gray" padding={1} marginY={1}>
            <Text>{commitMessage}</Text>
          </Box>
          
          {diff && (
            <>
              <Text color="gray">
                Files: {diff.files.join(', ')} (+{diff.additions} -{diff.deletions})
              </Text>
              <Text></Text>
            </>
          )}
          
          {aiWarnings.length > 0 && (
            <>
              <Text color="yellow" bold>⚠️  Diff Processing Warnings:</Text>
              {aiWarnings.map((warning, index) => (
                <Text key={index} color="yellow">• {warning}</Text>
              ))}
              <Text></Text>
            </>
          )}
          
          <Text>What would you like to do?</Text>
          <SelectInput
            items={[
              { label: '✅ Commit with this message', value: 'commit' },
              { label: '✏️  Edit message', value: 'edit' },
              { label: '🔄 Regenerate message', value: 'regenerate' },
              { label: '❌ Cancel', value: 'cancel' },
            ]}
            onSelect={handleCommitChoice}
          />
        </>
      )}

      {customMessage !== '' && (
        <>
          <Text>Edit your commit message:</Text>
          <TextInput
            value={customMessage}
            onChange={setCustomMessage}
            onSubmit={handleCustomMessageSubmit}
          />
        </>
      )}

      {stage === 'committing' && (
        <Text>
          <Spinner type="dots" /> Committing...
        </Text>
      )}

      {stage === 'done' && (
        <>
          <Text color="green">✅ Successfully committed!</Text>
          {commitSummary && (
            <>
              <Text></Text>
              <Text color="gray">{commitSummary}</Text>
            </>
          )}
        </>
      )}

      {stage === 'error' && (
        <Text color="red">❌ Error: {error}</Text>
      )}
    </Box>
  );
};

const App: React.FC<AppProps> = ({ config }) => {
  const [showConfig, setShowConfig] = useState(config || false);
  const [configDone, setConfigDone] = useState(false);

  useEffect(() => {
    if (!config && !hasValidConfig()) {
      setShowConfig(true);
    }
  }, [config]);

  const handleConfigComplete = () => {
    setConfigDone(true);
    setShowConfig(false);
  };

  const handleExit = () => {
    process.exit(0);
  };

  if (showConfig) {
    return <ConfigSetup onComplete={handleConfigComplete} />;
  }

  return <CommitFlow onExit={handleExit} />;
};

const program = new Command();

program
  .name('one-commit')
  .description('AI-powered automatic commit message generator')
  .version('1.0.0')
  .option('-c, --config', 'configure OpenAI API settings')
  .action((options) => {
    render(<App config={options.config} />);
  });

program.parse();
import Conf from 'conf';
import { Config } from './types.js';

const config = new Conf<Config>({
  projectName: 'one-commit',
  defaults: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
});

export function getConfig(): Config {
  return {
    apiKey: config.get('apiKey') || process.env.OPENAI_API_KEY,
    baseUrl: config.get('baseUrl') || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: config.get('model') || 'gpt-4o-mini',
    language: config.get('language') || 'en',
  };
}

export function setConfig(updates: Partial<Config>): void {
  if (updates.apiKey) {
    config.set('apiKey', updates.apiKey);
  }
  if (updates.baseUrl) {
    config.set('baseUrl', updates.baseUrl);
  }
  if (updates.model) {
    config.set('model', updates.model);
  }
  if (updates.language) {
    config.set('language', updates.language);
  }
}

export function hasValidConfig(): boolean {
  const cfg = getConfig();
  return !!cfg.apiKey;
}

export function clearConfig(): void {
  config.clear();
}
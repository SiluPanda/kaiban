import type { LanguageModelV1 } from 'ai';

export interface AiConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export function getAiConfig(): AiConfig | null {
  const provider = process.env.PITH_AI_PROVIDER;
  const model = process.env.PITH_AI_MODEL;

  if (!provider || !model) return null;

  return {
    provider,
    model,
    apiKey: process.env.PITH_AI_API_KEY,
    baseUrl: process.env.PITH_AI_BASE_URL,
  };
}

export async function getModel(): Promise<LanguageModelV1 | null> {
  const config = getAiConfig();
  if (!config) return null;

  try {
    switch (config.provider) {
      case 'anthropic': {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const provider = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseUrl });
        return provider(config.model);
      }
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
        return provider(config.model);
      }
      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const provider = createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
        return provider(config.model);
      }
      case 'openrouter': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const provider = createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
        });
        return provider(config.model);
      }
      case 'ollama': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const provider = createOpenAI({
          apiKey: 'ollama',
          baseURL: config.baseUrl || 'http://localhost:11434/v1',
        });
        return provider(config.model);
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

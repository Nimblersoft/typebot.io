// USD per 1M tokens for common OpenRouter-routed models.
// Prices sourced from OpenRouter public pricing page. Update as needed.
// Unknown models fall back to $0 — usage is still logged, just without a cost.
type ModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
};

const MODEL_PRICING: Record<string, ModelPricing> = {
  "openai/gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "openai/gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "openai/gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },
  "openai/gpt-3.5-turbo": { inputPer1M: 0.5, outputPer1M: 1.5 },
  "anthropic/claude-3-5-sonnet": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "anthropic/claude-3-5-sonnet-20241022": {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
  "anthropic/claude-3-5-haiku": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "anthropic/claude-3-5-haiku-20241022": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "anthropic/claude-3-haiku": { inputPer1M: 0.25, outputPer1M: 1.25 },
  "anthropic/claude-3-opus": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "anthropic/claude-sonnet-4": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "meta-llama/llama-3.1-8b-instruct": { inputPer1M: 0.055, outputPer1M: 0.055 },
  "meta-llama/llama-3.1-70b-instruct": { inputPer1M: 0.52, outputPer1M: 0.75 },
  "meta-llama/llama-3.1-405b-instruct": { inputPer1M: 2.7, outputPer1M: 2.7 },
  "meta-llama/llama-3.3-70b-instruct": { inputPer1M: 0.1, outputPer1M: 0.28 },
  "mistralai/mistral-7b-instruct": { inputPer1M: 0.055, outputPer1M: 0.055 },
  "mistralai/mixtral-8x7b-instruct": { inputPer1M: 0.24, outputPer1M: 0.24 },
  "mistralai/mistral-small": { inputPer1M: 0.2, outputPer1M: 0.6 },
  "google/gemini-flash-1.5": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "google/gemini-pro-1.5": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "google/gemini-2.0-flash-001": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "deepseek/deepseek-chat": { inputPer1M: 0.14, outputPer1M: 0.28 },
  "deepseek/deepseek-r1": { inputPer1M: 0.55, outputPer1M: 2.19 },
};

export const computeTokenCost = (
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number => {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;
  return (
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M
  );
};

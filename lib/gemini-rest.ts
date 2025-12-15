/**
 * Gemini REST API Client
 * Direct REST API implementation as fallback for SDK issues
 * Based on biu-data-pipeline implementation
 */

import axios from 'axios';

interface GeminiResponse {
  text: string;
  tokensUsed: number;
}

export class GeminiRestClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private client: any;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate content using REST API
   */
  async generate(prompt: string, options: any = {}): Promise<GeminiResponse> {
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.3,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxOutputTokens || 8192,
      },
    };

    try {
      console.log(`Calling Gemini REST API with model: ${this.model}`);

      const response = await this.client.post(
        `/models/${this.model}:generateContent?key=${this.apiKey}`,
        requestBody
      );

      const candidate = response.data.candidates?.[0];

      if (!candidate) {
        throw new Error('No candidate response from Gemini API');
      }

      const text = candidate.content?.parts?.[0]?.text || '';

      console.log(`Gemini REST API response: ${text.length} chars`);

      return {
        text,
        tokensUsed: this._estimateTokens(prompt, text),
      };
    } catch (error: any) {
      console.error('Gemini REST API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response?.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please try again later.');
      }

      throw new Error(`Gemini REST API error: ${error.message}`);
    }
  }

  /**
   * Try multiple models until one works
   */
  async generateWithFallback(prompt: string, options: any = {}): Promise<GeminiResponse> {
    const modelsToTry = [
      'gemini-2.5-flash',      // Best price-performance (2025)
      'gemini-2.5-flash-lite', // Ultra-fast, cost-efficient
      'gemini-2.0-flash',      // Second-generation workhorse
      'gemini-2.0-flash-lite', // Compact, low-latency
      'gemini-2.5-pro',        // Advanced model
    ];

    let lastError: any;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying REST model: ${modelName}`);
        this.model = modelName;
        const result = await this.generate(prompt, options);
        console.log(`Success with REST model: ${modelName}`);
        return result;
      } catch (error: any) {
        console.log(`Failed with REST ${modelName}:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw lastError || new Error('All models failed with REST API');
  }

  /**
   * Estimate token count
   */
  private _estimateTokens(input: string, output: string): number {
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    return inputTokens + outputTokens;
  }
}

/**
 * Helper function to call Gemini with automatic fallback
 */
export async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const client = new GeminiRestClient(apiKey);
  const response = await client.generateWithFallback(prompt);
  return response.text;
}

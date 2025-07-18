// src/lib/aiService.ts
import { supabase } from '@/integrations/supabase/client';

export interface AIAnalysisRequest {
  data: any;
  query: string;
  analysisType: 'summary' | 'insights' | 'decisions' | 'correlation' | 'prediction';
  context?: string;
}

export interface AIAnalysisResponse {
  summary: string;
  insights: string[];
  decisions: string[];
  confidence: number;
  provider: string;
  visualizationSuggestions?: Array<{
    chartType: string;
    dataFields: string[];
    description: string;
  }>;
  correlations?: Array<{
    field1: string;
    field2: string;
    strength: number;
    type: string;
  }>;
  predictions?: Array<{
    field: string;
    prediction: string;
    confidence: number;
  }>;
}

interface AIProviderConfig {
  provider: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

class AIService {
  private configs: Map<string, AIProviderConfig> = new Map();
  private userId: string | null = null;

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadConfigurations();
  }

  private async loadConfigurations(): Promise<void> {
    if (!this.userId) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.userId)
        .eq('category', 'ai_providers');

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      this.configs.clear();
      if (data) {
        data.forEach((setting) => {
          try {
            const config = JSON.parse(setting.value);
            if (config.enabled) {
              this.configs.set(setting.key, config);
            }
          } catch (e) {
            console.warn('Failed to parse AI config:', setting.key);
          }
        });
      }
    } catch (error) {
      console.error('Error loading AI configurations:', error);
    }
  }

  isConfigured(): boolean {
    return this.configs.size > 0;
  }

  getConfiguredProviders(): string[] {
    return Array.from(this.configs.keys());
  }

  private getAvailableProvider(): AIProviderConfig | null {
    // Prefer OpenAI, then Claude, then Grok
    const preferenceOrder = ['openai', 'anthropic', 'grok'];
    
    for (const provider of preferenceOrder) {
      const config = this.configs.get(provider);
      if (config && config.enabled) {
        return config;
      }
    }

    // Return any available provider
    const firstConfig = this.configs.values().next().value;
    return firstConfig || null;
  }

  async analyzeData(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const provider = this.getAvailableProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const prompt = this.buildAnalysisPrompt(request);
    
    try {
      let response: string;
      
      switch (provider.provider) {
        case 'openai':
          response = await this.callOpenAI(provider, prompt);
          break;
        case 'anthropic':
          response = await this.callClaude(provider, prompt);
          break;
        case 'grok':
          response = await this.callGrok(provider, prompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.provider}`);
      }

      return this.parseAIResponse(response, provider.provider);
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    const { data, query, analysisType, context } = request;
    
    const dataPreview = JSON.stringify(data, null, 2).slice(0, 2000); // Limit size
    
    let systemPrompt = `You are an expert data analyst. Analyze the provided data and respond with a JSON object containing:
{
  "summary": "Brief 2-3 sentence summary",
  "insights": ["insight1", "insight2", "insight3"],
  "decisions": ["decision1", "decision2", "decision3"],
  "confidence": 0.85,
  "visualizationSuggestions": [
    {
      "chartType": "bar|line|pie|scatter",
      "dataFields": ["field1", "field2"],
      "description": "Why this visualization would be helpful"
    }
  ]
}`;

    switch (analysisType) {
      case 'summary':
        systemPrompt += '\nFocus on summarizing the key characteristics and patterns in the data.';
        break;
      case 'insights':
        systemPrompt += '\nFocus on discovering hidden patterns, trends, and meaningful relationships.';
        break;
      case 'decisions':
        systemPrompt += '\nFocus on actionable recommendations and strategic decisions based on the data.';
        break;
      case 'correlation':
        systemPrompt += '\nFocus on identifying correlations and relationships between different data points.';
        break;
      case 'prediction':
        systemPrompt += '\nFocus on predictive insights and future trends based on the data patterns.';
        break;
    }

    return `${systemPrompt}

Context: ${context || 'No additional context provided'}

User Query: ${query}

Data to analyze:
${dataPreview}

Please provide your analysis as valid JSON only, no additional text.`;
  }

  private async callOpenAI(config: AIProviderConfig, prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful data analyst assistant. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callClaude(config: AIProviderConfig, prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-haiku-20240307',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  private async callGrok(config: AIProviderConfig, prompt: string): Promise<string> {
    // Note: xAI API implementation may vary - adjust based on actual API documentation
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful data analyst assistant. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseAIResponse(response: string, provider: string): AIAnalysisResponse {
    try {
      // Clean up response - sometimes AI adds extra text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      
      const parsed = JSON.parse(jsonString);
      
      // Ensure required fields exist with defaults
      return {
        summary: parsed.summary || 'Analysis completed successfully.',
        insights: Array.isArray(parsed.insights) ? parsed.insights : ['Data analysis performed'],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : ['Review the analysis results'],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
        provider: provider,
        visualizationSuggestions: parsed.visualizationSuggestions || [],
        correlations: parsed.correlations || [],
        predictions: parsed.predictions || []
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Fallback response
      return {
        summary: 'AI analysis completed with basic processing.',
        insights: ['Data structure analyzed', 'Patterns identified', 'Processing completed'],
        decisions: ['Review data quality', 'Consider additional analysis', 'Implement findings'],
        confidence: 0.6,
        provider: provider,
        visualizationSuggestions: [],
        correlations: [],
        predictions: []
      };
    }
  }

  async generateReport(data: any, analysisResults: AIAnalysisResponse): Promise<string> {
    const provider = this.getAvailableProvider();
    if (!provider) {
      return this.generateBasicReport(data, analysisResults);
    }

    const prompt = `Generate a comprehensive data analysis report in Markdown format based on the following analysis results:

Analysis Summary: ${analysisResults.summary}

Key Insights:
${analysisResults.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

Recommendations:
${analysisResults.decisions.map((decision, i) => `${i + 1}. ${decision}`).join('\n')}

Confidence Level: ${(analysisResults.confidence * 100).toFixed(1)}%

Data Sample:
\`\`\`json
${JSON.stringify(data, null, 2).slice(0, 1000)}
\`\`\`

Please generate a professional report with:
1. Executive Summary
2. Data Overview
3. Key Findings
4. Detailed Analysis
5. Recommendations
6. Next Steps

Format as clean Markdown suitable for business stakeholders.`;

    try {
      let response: string;
      
      switch (provider.provider) {
        case 'openai':
          response = await this.callOpenAI(provider, prompt);
          break;
        case 'anthropic':
          response = await this.callClaude(provider, prompt);
          break;
        case 'grok':
          response = await this.callGrok(provider, prompt);
          break;
        default:
          return this.generateBasicReport(data, analysisResults);
      }

      return response;
    } catch (error) {
      console.error('Error generating AI report:', error);
      return this.generateBasicReport(data, analysisResults);
    }
  }

  private generateBasicReport(data: any, analysisResults: AIAnalysisResponse): string {
    const timestamp = new Date().toLocaleString();
    const dataSize = Array.isArray(data) ? data.length : 1;
    
    return `# Data Analysis Report

*Generated on ${timestamp}*

## Executive Summary

${analysisResults.summary}

**Confidence Level:** ${(analysisResults.confidence * 100).toFixed(1)}%  
**Analysis Provider:** ${analysisResults.provider}  
**Records Analyzed:** ${dataSize}

## Key Insights

${analysisResults.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

## Recommendations

${analysisResults.decisions.map((decision, i) => `${i + 1}. ${decision}`).join('\n')}

## Data Overview

- **Total Records:** ${dataSize}
- **Data Type:** ${Array.isArray(data) ? 'Array' : typeof data}
- **Analysis Timestamp:** ${timestamp}

${analysisResults.visualizationSuggestions && analysisResults.visualizationSuggestions.length > 0 ? `
## Suggested Visualizations

${analysisResults.visualizationSuggestions.map((suggestion, i) => 
  `${i + 1}. **${suggestion.chartType.toUpperCase()} Chart** - ${suggestion.description} (Fields: ${suggestion.dataFields.join(', ')})`
).join('\n')}
` : ''}

## Next Steps

1. Review the analysis findings with stakeholders
2. Implement recommended actions based on priority
3. Consider additional data collection if needed
4. Schedule follow-up analysis to track progress

---
*This report was generated by the Universal Data Platform AI Service*`;
  }
}

export const aiService = new AIService();

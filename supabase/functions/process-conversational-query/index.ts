import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationContext {
  messages: any[];
  currentDataset?: any;
  previousQueries: string[];
}

interface QueryRequest {
  query: string;
  context: ConversationContext;
  includeCharts: boolean;
  voiceResponse: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user from the auth header
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { query, context, includeCharts, voiceResponse }: QueryRequest = await req.json();

    // Get AI configuration for the user
    const { data: aiSettings } = await supabaseClient
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'ai_providers');

    let aiConfig = null;
    if (aiSettings && aiSettings.length > 0) {
      // Find the first enabled AI provider
      for (const setting of aiSettings) {
        const config = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        if (config.enabled) {
          aiConfig = { provider: setting.key, ...config };
          break;
        }
      }
    }

    if (!aiConfig) {
      throw new Error('No AI provider configured. Please configure an AI provider in settings.');
    }

    // Get user's agent data for context
    const { data: agentData } = await supabaseClient
      .from('agent_data')
      .select('*')
      .eq('user_id', user.id)
      .order('collected_at', { ascending: false })
      .limit(10);

    // Get semantic entities for additional context
    const { data: semanticEntities } = await supabaseClient
      .from('semantic_entities')
      .select('*')
      .limit(20);

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(query, context, agentData, semanticEntities, includeCharts);

    // Call the appropriate AI provider
    let response;
    switch (aiConfig.provider) {
      case 'openai':
        response = await callOpenAI(aiConfig, prompt);
        break;
      case 'anthropic':
        response = await callClaude(aiConfig, prompt);
        break;
      case 'grok':
        response = await callGrok(aiConfig, prompt);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
    }

    // Parse the response to extract text and chart data
    const parsedResponse = parseAIResponse(response, includeCharts);

    // Generate audio response if requested
    let audioResponse = null;
    if (voiceResponse && parsedResponse.textResponse) {
      audioResponse = await generateAudioResponse(parsedResponse.textResponse);
    }

    return new Response(JSON.stringify({
      textResponse: parsedResponse.textResponse,
      chartData: parsedResponse.chartData,
      chartType: parsedResponse.chartType,
      audioResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing conversational query:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildAnalysisPrompt(
  query: string, 
  context: ConversationContext, 
  agentData: any[], 
  semanticEntities: any[],
  includeCharts: boolean
): string {
  return `You are an intelligent data analyst assistant. Analyze the user's query and provide insights based on the available data.

User Query: "${query}"

Previous Context:
${context.previousQueries.slice(-3).map((q, i) => `${i + 1}. ${q}`).join('\n')}

Available Data:
${agentData.map(data => `- Agent: ${data.agent_id}, Status: ${data.status}, Collected: ${data.collected_at}`).join('\n')}

Semantic Entities:
${semanticEntities.map(entity => `- ${entity.entity_type}: ${entity.entity_value} (confidence: ${entity.confidence_score})`).join('\n')}

Instructions:
1. Provide a clear, conversational response to the user's query
2. Use the available data to support your analysis
3. Be specific and reference actual data points when possible
4. Keep responses concise but informative
${includeCharts ? `
5. If appropriate, suggest chart data in this format:
CHART_DATA: [{"name": "Category", "value": 123}, ...]
CHART_TYPE: bar|line|pie
` : ''}

Response:`;
}

async function callOpenAI(config: any, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful data analysis assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(config: any, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callGrok(config: any, prompt: string): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a helpful data analysis assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseAIResponse(response: string, includeCharts: boolean) {
  let textResponse = response;
  let chartData = null;
  let chartType = null;

  if (includeCharts) {
    // Extract chart data if present
    const chartDataMatch = response.match(/CHART_DATA:\s*(\[.*?\])/s);
    const chartTypeMatch = response.match(/CHART_TYPE:\s*(\w+)/);

    if (chartDataMatch && chartTypeMatch) {
      try {
        chartData = JSON.parse(chartDataMatch[1]);
        chartType = chartTypeMatch[1];
        
        // Remove chart data from text response
        textResponse = response
          .replace(/CHART_DATA:\s*\[.*?\]/s, '')
          .replace(/CHART_TYPE:\s*\w+/g, '')
          .trim();
      } catch (e) {
        console.warn('Failed to parse chart data:', e);
      }
    }
  }

  return { textResponse, chartData, chartType };
}

async function generateAudioResponse(text: string): Promise<string | null> {
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.warn('OpenAI API key not available for audio generation');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy',
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64Audio;
  } catch (error) {
    console.error('Error generating audio response:', error);
    return null;
  }
}
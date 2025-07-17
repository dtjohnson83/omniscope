
import type { ProcessedResponse } from './types';

export function processAgentResponse(rawResponse: any, agent: any): ProcessedResponse {
  try {
    const processed: ProcessedResponse = {
      timestamp: new Date().toISOString(),
      agent_name: agent.name,
      data_types: agent.data_types || []
    };

    if (typeof rawResponse === 'object' && rawResponse !== null) {
      const numericFields = extractNumericFields(rawResponse);
      if (Object.keys(numericFields).length > 0) {
        processed.metrics = numericFields;
      }

      const textFields = extractTextFields(rawResponse);
      if (Object.keys(textFields).length > 0) {
        processed.content = textFields;
      }

      processed.response_structure = analyzeStructure(rawResponse);
    }

    return processed;
  } catch (error) {
    console.error('Error processing response:', error);
    return { 
      timestamp: new Date().toISOString(),
      agent_name: agent.name,
      data_types: agent.data_types || [],
      error: 'Failed to process response', 
      raw: rawResponse 
    };
  }
}

export class AgentDataProcessor {
  processResponse(rawResponse: any, dataTypes: string[]): any {
    return processAgentResponse(rawResponse, { name: 'Unknown', data_types: dataTypes });
  }
}

function extractNumericFields(obj: any, prefix = ''): Record<string, number> {
  const numeric: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'number') {
      numeric[fieldName] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(numeric, extractNumericFields(value, fieldName));
    }
  }
  
  return numeric;
}

function extractTextFields(obj: any, prefix = ''): Record<string, string> {
  const textFields: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string' && value.length > 0) {
      textFields[fieldName] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(textFields, extractTextFields(value, fieldName));
    }
  }
  
  return textFields;
}

function analyzeStructure(obj: any): any {
  return {
    type: Array.isArray(obj) ? 'array' : typeof obj,
    keys: typeof obj === 'object' && obj !== null ? Object.keys(obj) : [],
    array_length: Array.isArray(obj) ? obj.length : undefined
  };
}

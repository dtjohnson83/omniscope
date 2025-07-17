// src/lib/semanticProcessor.ts
export interface Entity {
  type: string;
  value: string;
  confidence: number;
  fieldSource: string;
}

export interface SemanticMetadata {
  entities: Entity[];
  dataTypes: { [key: string]: string };
  patterns: string[];
  correlationHints: string[];
  llmDescription: string;
  timestamp: string;
}

export interface CrossAgentCorrelation {
  sourceAgent: string;
  targetAgent: string;
  correlationType: string;
  strength: number;
  sharedEntities: string[];
}

export class SemanticProcessor {
  
  // New method to extract semantic data
  async extractSemanticData(processedData: any): Promise<SemanticMetadata> {
    return SemanticProcessor.processData(processedData, 'unknown');
  }
  
  // Extract entities from data using simple pattern matching
  static extractEntities(data: any): Entity[] {
    const entities: Entity[] = [];
    
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        entities.push(...this.extractFromObject(item, `item_${index}`));
      });
    } else if (typeof data === 'object' && data !== null) {
      entities.push(...this.extractFromObject(data, 'root'));
    }
    
    return entities;
  }
  
  private static extractFromObject(obj: any, prefix: string): Entity[] {
    const entities: Entity[] = [];
    
    Object.entries(obj).forEach(([key, value]) => {
      const fieldSource = `${prefix}.${key}`;
      
      if (typeof value === 'string') {
        // Email detection
        if (this.isEmail(value)) {
          entities.push({
            type: 'email',
            value: value,
            confidence: 0.95,
            fieldSource: fieldSource
          });
        }
        
        // URL detection
        if (this.isURL(value)) {
          entities.push({
            type: 'url',
            value: value,
            confidence: 0.9,
            fieldSource: fieldSource
          });
        }
        
        // Date detection
        if (this.isDate(value)) {
          entities.push({
            type: 'date',
            value: value,
            confidence: 0.8,
            fieldSource: fieldSource
          });
        }
        
        // Name detection (simple heuristic)
        if (this.isPersonName(key, value)) {
          entities.push({
            type: 'person_name',
            value: value,
            confidence: 0.7,
            fieldSource: fieldSource
          });
        }
        
        // Location detection
        if (this.isLocation(key, value)) {
          entities.push({
            type: 'location',
            value: value,
            confidence: 0.6,
            fieldSource: fieldSource
          });
        }
      }
      
      if (typeof value === 'number') {
        // Price detection
        if (this.isPrice(key, value)) {
          entities.push({
            type: 'price',
            value: value.toString(),
            confidence: 0.8,
            fieldSource: fieldSource
          });
        }
        
        // ID detection
        if (this.isId(key)) {
          entities.push({
            type: 'identifier',
            value: value.toString(),
            confidence: 0.9,
            fieldSource: fieldSource
          });
        }
      }
    });
    
    return entities;
  }
  
  // Pattern matching functions
  private static isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }
  
  private static isURL(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  
  private static isDate(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.length > 8;
  }
  
  private static isPersonName(key: string, value: string): boolean {
    const nameFields = ['name', 'firstname', 'lastname', 'fullname', 'author', 'user'];
    const keyLower = key.toLowerCase();
    return nameFields.some(field => keyLower.includes(field)) && 
           typeof value === 'string' && 
           value.length > 1 && 
           value.length < 50 &&
           /^[a-zA-Z\s'-]+$/.test(value);
  }
  
  private static isLocation(key: string, value: string): boolean {
    const locationFields = ['city', 'country', 'location', 'address', 'region', 'state'];
    const keyLower = key.toLowerCase();
    return locationFields.some(field => keyLower.includes(field));
  }
  
  private static isPrice(key: string, value: number): boolean {
    const priceFields = ['price', 'cost', 'amount', 'value', 'fee', 'salary'];
    const keyLower = key.toLowerCase();
    return priceFields.some(field => keyLower.includes(field)) && value > 0;
  }
  
  private static isId(key: string): boolean {
    const idFields = ['id', 'uid', 'key', 'index'];
    const keyLower = key.toLowerCase();
    return idFields.some(field => keyLower.includes(field));
  }
  
  // Detect data types and patterns
  static analyzeDataStructure(data: any): { [key: string]: string } {
    const dataTypes: { [key: string]: string } = {};
    
    if (Array.isArray(data) && data.length > 0) {
      const sampleItem = data[0];
      Object.entries(sampleItem).forEach(([key, value]) => {
        dataTypes[key] = typeof value;
      });
    } else if (typeof data === 'object' && data !== null) {
      Object.entries(data).forEach(([key, value]) => {
        dataTypes[key] = typeof value;
      });
    }
    
    return dataTypes;
  }
  
  // Find patterns in data
  static findPatterns(data: any): string[] {
    const patterns: string[] = [];
    
    if (Array.isArray(data)) {
      patterns.push(`Array of ${data.length} items`);
      
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        patterns.push(`Common fields: ${keys.slice(0, 5).join(', ')}`);
        
        // Check for time series
        if (keys.some(key => key.toLowerCase().includes('time') || key.toLowerCase().includes('date'))) {
          patterns.push('Time series data detected');
        }
        
        // Check for user data
        if (keys.some(key => key.toLowerCase().includes('user') || key.toLowerCase().includes('name'))) {
          patterns.push('User/identity data detected');
        }
        
        // Check for metrics
        const numericFields = keys.filter(key => typeof data[0][key] === 'number');
        if (numericFields.length > 0) {
          patterns.push(`Metrics available: ${numericFields.slice(0, 3).join(', ')}`);
        }
      }
    }
    
    return patterns;
  }
  
  // Generate correlation hints for cross-agent analysis
  static generateCorrelationHints(entities: Entity[], agentName: string): string[] {
    const hints: string[] = [];
    
    entities.forEach(entity => {
      switch (entity.type) {
        case 'email':
          hints.push(`User identity linkage via email from ${agentName}`);
          break;
        case 'date':
          hints.push(`Temporal correlation opportunity from ${agentName}`);
          break;
        case 'location':
          hints.push(`Geographic correlation from ${agentName}`);
          break;
        case 'price':
          hints.push(`Financial correlation from ${agentName}`);
          break;
        case 'identifier':
          hints.push(`Cross-reference potential via ID from ${agentName}`);
          break;
      }
    });
    
    return hints;
  }
  
  // Generate LLM-optimized description
  static generateLLMDescription(data: any, entities: Entity[], agentName: string): string {
    const entitySummary = entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const dataSize = Array.isArray(data) ? data.length : 1;
    const entityTypes = Object.keys(entitySummary);
    
    let description = `Data from ${agentName}: ${dataSize} record(s) containing `;
    
    if (entityTypes.length > 0) {
      const entityDescriptions = entityTypes.map(type => 
        `${entitySummary[type]} ${type}${entitySummary[type] > 1 ? 's' : ''}`
      );
      description += entityDescriptions.join(', ');
    } else {
      description += 'structured data without specific entities detected';
    }
    
    description += `. This data can be cross-referenced with other sources for correlation analysis.`;
    
    return description;
  }
  
  // Main processing function
  static processData(data: any, agentName: string): SemanticMetadata {
    const entities = this.extractEntities(data);
    const dataTypes = this.analyzeDataStructure(data);
    const patterns = this.findPatterns(data);
    const correlationHints = this.generateCorrelationHints(entities, agentName);
    const llmDescription = this.generateLLMDescription(data, entities, agentName);
    
    return {
      entities,
      dataTypes,
      patterns,
      correlationHints,
      llmDescription,
      timestamp: new Date().toISOString()
    };
  }
  
  // Find correlations between different agent data
  static findCrossAgentCorrelations(
    sourceData: { agent: string; entities: Entity[] },
    targetData: { agent: string; entities: Entity[] }[]
  ): CrossAgentCorrelation[] {
    const correlations: CrossAgentCorrelation[] = [];
    
    targetData.forEach(target => {
      if (target.agent === sourceData.agent) return; // Skip same agent
      
      const sharedEntities: string[] = [];
      let correlationStrength = 0;
      
      sourceData.entities.forEach(sourceEntity => {
        target.entities.forEach(targetEntity => {
          if (sourceEntity.type === targetEntity.type && 
              sourceEntity.value === targetEntity.value) {
            sharedEntities.push(`${sourceEntity.type}:${sourceEntity.value}`);
            correlationStrength += Math.min(sourceEntity.confidence, targetEntity.confidence);
          }
        });
      });
      
      if (sharedEntities.length > 0) {
        correlations.push({
          sourceAgent: sourceData.agent,
          targetAgent: target.agent,
          correlationType: this.determineCorrelationType(sharedEntities),
          strength: correlationStrength / sharedEntities.length,
          sharedEntities
        });
      }
    });
    
    return correlations;
  }
  
  private static determineCorrelationType(sharedEntities: string[]): string {
    const entityTypes = sharedEntities.map(e => e.split(':')[0]);
    
    if (entityTypes.includes('email') || entityTypes.includes('person_name')) {
      return 'user_identity';
    } else if (entityTypes.includes('date')) {
      return 'temporal';
    } else if (entityTypes.includes('location')) {
      return 'geographic';
    } else if (entityTypes.includes('identifier')) {
      return 'reference';
    } else {
      return 'data_overlap';
    }
  }
}

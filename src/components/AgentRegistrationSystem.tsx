const QueryInterface = ({ user }: { user: any }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userAgents, setUserAgents] = useState<any[]>([]);

  // Load user's agents on component mount
  useEffect(() => {
    loadUserAgents();
  }, [user]);

  const loadUserAgents = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('agents')
      .select('id, name, data_types, category')
      .eq('user_id', user.id);
    
    setUserAgents(data || []);
  };

  const handleQuery = async () => {
    if (!question.trim() || !user) return;
    
    setLoading(true);
    try {
      const response = await processUniversalQuery(question, user.id, userAgents);
      setResponse(response);
    } catch (error) {
      console.error('Query error:', error);
      setResponse({
        answer: "Sorry, I couldn't process that question. Please try again.",
        execution_method: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const processUniversalQuery = async (question: string, userId: string, agents: any[]) => {
    const lowerQ = question.toLowerCase();
    
    // 1. Determine query intent and extract keywords
    const intent = analyzeQueryIntent(lowerQ, agents);
    
    // 2. Based on intent, route to appropriate handler
    switch (intent.type) {
      case 'current_value':
        return await handleCurrentValueQuery(intent, userId);
      case 'agent_status':
        return await handleAgentStatusQuery(intent, userId);
      case 'latest_data':
        return await handleLatestDataQuery(intent, userId);
      case 'comparison':
        return await handleComparisonQuery(intent, userId);
      case 'trend':
        return await handleTrendQuery(intent, userId);
      case 'all_data':
        return await handleAllDataQuery(intent, userId);
      default:
        return await handleGeneralQuery(question, userId, agents);
    }
  };

  const analyzeQueryIntent = (question: string, agents: any[]) => {
    // Extract agent names mentioned in question
    const mentionedAgents = agents.filter(agent => 
      question.includes(agent.name.toLowerCase()) ||
      agent.data_types?.some((type: string) => question.includes(type.toLowerCase()))
    );

    // Determine query type based on keywords
    if (question.includes('current') || question.includes('now') || question.includes('latest')) {
      return {
        type: 'current_value',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents,
        keywords: extractDataKeywords(question)
      };
    }
    
    if (question.includes('status') || question.includes('health') || question.includes('working')) {
      return {
        type: 'agent_status',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents
      };
    }
    
    if (question.includes('compare') || question.includes('vs') || question.includes('versus')) {
      return {
        type: 'comparison',
        agents: mentionedAgents,
        keywords: extractDataKeywords(question)
      };
    }
    
    if (question.includes('trend') || question.includes('over time') || question.includes('history')) {
      return {
        type: 'trend',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents,
        keywords: extractDataKeywords(question)
      };
    }
    
    if (question.includes('show me') || question.includes('display') || question.includes('list')) {
      return {
        type: 'latest_data',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents
      };
    }
    
    if (question.includes('all') || question.includes('everything')) {
      return {
        type: 'all_data',
        agents: agents
      };
    }

    return {
      type: 'general',
      agents: mentionedAgents.length > 0 ? mentionedAgents : agents,
      keywords: extractDataKeywords(question)
    };
  };

  const extractDataKeywords = (question: string) => {
    // Common data keywords to look for
    const dataKeywords = [
      'price', 'value', 'amount', 'cost', 'rate', 'score', 'count', 'number',
      'temperature', 'humidity', 'pressure', 'speed', 'size', 'volume',
      'percentage', 'ratio', 'average', 'total', 'sum', 'min', 'max'
    ];
    
    return dataKeywords.filter(keyword => question.includes(keyword));
  };

  const handleCurrentValueQuery = async (intent: any, userId: string) => {
    if (intent.agents.length === 0) {
      return {
        answer: "I don't see any agents matching your query. Please check your agent names.",
        execution_method: 'function_calling'
      };
    }

    const agentIds = intent.agents.map((agent: any) => agent.id);
    
    const { data } = await supabase
      .from('agent_data')
      .select(`
        processed_data,
        collected_at,
        agents!inner(name, data_types)
      `)
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .order('collected_at', { ascending: false })
      .limit(intent.agents.length);

    if (!data || data.length === 0) {
      return {
        answer: `No recent data found for ${intent.agents.map((a: any) => a.name).join(', ')}. Make sure your agents are running.`,
        execution_method: 'function_calling'
      };
    }

    // Extract current values from latest data
    const results = data.map(record => {
      const agentName = record.agents.name;
      const processedData = record.processed_data;
      
      // Find relevant values in the data
      const values = extractRelevantValues(processedData, intent.keywords);
      
      return {
        agent: agentName,
        values: values,
        timestamp: record.collected_at
      };
    });

    const answer = formatCurrentValueResponse(results);
    
    return {
      answer,
      data: results,
      execution_method: 'function_calling'
    };
  };

  const handleAgentStatusQuery = async (intent: any, userId: string) => {
    const agentIds = intent.agents.map((agent: any) => agent.id);
    
    const { data } = await supabase
      .from('agent_data')
      .select(`
        status,
        collected_at,
        response_time_ms,
        agents!inner(name)
      `)
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .gte('collected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('collected_at', { ascending: false });

    const agentStats = data?.reduce((acc: any, record: any) => {
      const agentName = record.agents.name;
      if (!acc[agentName]) {
        acc[agentName] = { 
          total: 0, 
          success: 0, 
          avg_response_time: 0,
          last_execution: null 
        };
      }
      acc[agentName].total++;
      if (record.status === 'success') acc[agentName].success++;
      if (record.response_time_ms) {
        acc[agentName].avg_response_time += record.response_time_ms;
      }
      if (!acc[agentName].last_execution || record.collected_at > acc[agentName].last_execution) {
        acc[agentName].last_execution = record.collected_at;
      }
      return acc;
    }, {});

    // Calculate averages
    Object.keys(agentStats || {}).forEach(agentName => {
      if (agentStats[agentName].total > 0) {
        agentStats[agentName].avg_response_time = Math.round(
          agentStats[agentName].avg_response_time / agentStats[agentName].total
        );
      }
    });

    const summary = Object.entries(agentStats || {})
      .map(([name, stats]: [string, any]) => {
        const successRate = Math.round((stats.success / stats.total) * 100);
        const lastSeen = new Date(stats.last_execution).toLocaleTimeString();
        return `${name}: ${successRate}% success rate, ${stats.avg_response_time}ms avg response, last seen ${lastSeen}`;
      }).join('\n');

    return {
      answer: summary || "No agent activity in the last 24 hours.",
      data: agentStats,
      execution_method: 'function_calling'
    };
  };

  const handleLatestDataQuery = async (intent: any, userId: string) => {
    const agentIds = intent.agents.map((agent: any) => agent.id);
    
    const { data } = await supabase
      .from('agent_data')
      .select(`
        processed_data,
        collected_at,
        agents!inner(name, data_types)
      `)
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .order('collected_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      return {
        answer: "No recent data found for your agents.",
        execution_method: 'function_calling'
      };
    }

    const summary = data.map(record => {
      const agentName = record.agents.name;
      const timestamp = new Date(record.collected_at).toLocaleString();
      const dataSize = JSON.stringify(record.processed_data).length;
      
      return `${agentName}: ${dataSize} bytes collected at ${timestamp}`;
    }).slice(0, 5).join('\n');

    return {
      answer: `Latest data from your agents:\n${summary}`,
      data: data,
      execution_method: 'function_calling'
    };
  };

  const handleAllDataQuery = async (intent: any, userId: string) => {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, status, execution_count, success_count')
      .eq('user_id', userId);

    const { data: recentData } = await supabase
      .from('agent_data')
      .select('agent_id, status')
      .eq('user_id', userId)
      .gte('collected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const summary = `You have ${agents?.length || 0} registered agents. ` +
      `${recentData?.filter(d => d.status === 'success').length || 0} successful executions ` +
      `in the last 24 hours out of ${recentData?.length || 0} total attempts.`;

    return {
      answer: summary,
      data: { agents, recentData },
      execution_method: 'function_calling'
    };
  };

  const handleGeneralQuery = async (question: string, userId: string, agents: any[]) => {
    // Fallback for questions we can't categorize
    const agentNames = agents.map(a => a.name).join(', ');
    
    return {
      answer: `I can help you query data from your agents: ${agentNames}. ` +
              `Try asking "What's the current data from [agent name]?" or "How are my agents doing?"`,
      execution_method: 'function_calling'
    };
  };

  const extractRelevantValues = (processedData: any, keywords: string[]) => {
    if (!processedData) return {};
    
    const values: any = {};
    
    // If keywords are specified, look for those specifically
    if (keywords.length > 0) {
      keywords.forEach(keyword => {
        findValuesByKeyword(processedData, keyword, values);
      });
    } else {
      // Otherwise, extract all numeric values
      extractAllNumericValues(processedData, values);
    }
    
    return values;
  };

  const findValuesByKeyword = (obj: any, keyword: string, results: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return;
    
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (key.toLowerCase().includes(keyword.toLowerCase())) {
        results[currentPath] = value;
      }
      
      if (typeof value === 'object' && value !== null) {
        findValuesByKeyword(value, keyword, results, currentPath);
      }
    });
  };

  const extractAllNumericValues = (obj: any, results: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return;
    
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'number') {
        results[currentPath] = value;
      } else if (typeof value === 'object' && value !== null) {
        extractAllNumericValues(value, results, currentPath);
      }
    });
  };

  const formatCurrentValueResponse = (results: any[]) => {
    return results.map(result => {
      const { agent, values, timestamp } = result;
      const time = new Date(timestamp).toLocaleTimeString();
      
      if (Object.keys(values).length === 0) {
        return `${agent}: No relevant data found (last updated ${time})`;
      }
      
      const valueStrings = Object.entries(values)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return `${agent}: ${valueStrings} (updated ${time})`;
    }).join('\n');
  };

  const generateExampleQuestions = () => {
    if (userAgents.length === 0) return [];
    
    const examples = [];
    
    // Generate examples based on user's actual agents
    if (userAgents.length > 0) {
      const firstAgent = userAgents[0];
      examples.push(`What's the current data from ${firstAgent.name}?`);
      examples.push(`How is ${firstAgent.name} performing?`);
    }
    
    if (userAgents.length > 1) {
      examples.push(`Show me latest data from all agents`);
      examples.push(`Compare my agents' performance`);
    }
    
    examples.push(`How are my agents doing?`);
    
    return examples;
  };

  const exampleQuestions = generateExampleQuestions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>🤖 Ask Questions About Your Data</CardTitle>
        <p className="text-sm text-gray-600">
          Query any of your {userAgents.length} registered agents using natural language
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's the current data? How are my agents performing? Show me latest updates..."
            onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleQuery} disabled={loading}>
            {loading ? '🤔 Thinking...' : '🔍 Ask'}
          </Button>
        </div>

        {exampleQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.slice(0, 3).map((example, index) => (
              <Button 
                key={index}
                variant="outline" 
                size="sm" 
                onClick={() => setQuestion(example)}
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        )}

        {response && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              <pre className="text-blue-900 font-medium whitespace-pre-wrap">{response.answer}</pre>
              <div className="text-xs text-blue-600 mt-2">
                Method: {response.execution_method}
              </div>
            </div>

            {response.data && (
              <details className="bg-gray-50 p-4 rounded-lg">
                <summary className="font-semibold cursor-pointer">📋 Raw Data</summary>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {userAgents.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>No agents registered yet. Register some agents first to query their data!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// src/components/AISettings.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Eye, EyeOff, Key, Settings, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  apiKeyPlaceholder: string;
  endpoint?: string;
  models: string[];
  status: 'connected' | 'disconnected' | 'testing';
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5-turbo, and other OpenAI models',
    apiKeyPlaceholder: 'sk-...',
    endpoint: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    status: 'disconnected'
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    description: 'Claude-3 Opus, Sonnet, and Haiku models',
    apiKeyPlaceholder: 'sk-ant-...',
    endpoint: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    status: 'disconnected'
  },
{
  id: 'grok',
  name: 'Grok (xAI)',
  description: 'Grok models by xAI for real-time analysis',
  apiKeyPlaceholder: 'xai-...',
  endpoint: 'https://api.x.ai/v1',
  models: ['grok-4', 'grok-3', 'grok-3-mini', 'grok-2-image-1212'],
  status: 'disconnected'
}
];

interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export const AISettings: React.FC = () => {
  const [providers, setProviders] = useState<AIProvider[]>(AI_PROVIDERS);
  const [configs, setConfigs] = useState<{ [key: string]: AIConfig }>({});
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  const [activeProvider, setActiveProvider] = useState<string>('openai');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAIConfigs();
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const loadAIConfigs = async () => {
    try {
      // In a real app, you'd want to encrypt these in the database
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'ai_providers');

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const configData: { [key: string]: AIConfig } = {};
      if (data) {
        data.forEach((setting) => {
          try {
            configData[setting.key] = JSON.parse(setting.value);
          } catch (e) {
            console.warn('Failed to parse AI config:', setting.key);
          }
        });
      }

      setConfigs(configData);
      
      // Update provider statuses
      setProviders(prev => prev.map(provider => ({
        ...provider,
        status: configData[provider.id]?.enabled ? 'connected' : 'disconnected'
      })));
    } catch (error) {
      console.error('Error loading AI configs:', error);
    }
  };

  const saveAIConfig = async (providerId: string, config: AIConfig) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          category: 'ai_providers',
          key: providerId,
          value: JSON.stringify(config)
        });

      if (error) throw error;

      setConfigs(prev => ({ ...prev, [providerId]: config }));
      
      toast({
        title: 'Success',
        description: `${providers.find(p => p.id === providerId)?.name} configuration saved`
      });

      // Update provider status
      setProviders(prev => prev.map(provider => 
        provider.id === providerId 
          ? { ...provider, status: config.enabled ? 'connected' : 'disconnected' }
          : provider
      ));
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive'
      });
    }
  };

  const testConnection = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    const config = configs[providerId];
    
    if (!provider || !config?.apiKey) {
      toast({
        title: 'Error',
        description: 'Please enter an API key first',
        variant: 'destructive'
      });
      return;
    }

    setTestingProvider(providerId);
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, status: 'testing' } : p
    ));

    try {
      const success = await testAIProvider(provider, config);
      
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, status: success ? 'connected' : 'disconnected' }
          : p
      ));

      toast({
        title: success ? 'Success' : 'Error',
        description: success 
          ? `Successfully connected to ${provider.name}` 
          : `Failed to connect to ${provider.name}`,
        variant: success ? 'default' : 'destructive'
      });

      if (success) {
        await saveAIConfig(providerId, { ...config, enabled: true });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, status: 'disconnected' } : p
      ));
      
      toast({
        title: 'Error',
        description: 'Connection test failed',
        variant: 'destructive'
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const testAIProvider = async (provider: AIProvider, config: AIConfig): Promise<boolean> => {
    try {
      switch (provider.id) {
        case 'openai':
          return await testOpenAI(config.apiKey, config.model);
        case 'anthropic':
          return await testClaude(config.apiKey, config.model);
        case 'grok':
          return await testGrok(config.apiKey, config.model);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error testing ${provider.name}:`, error);
      return false;
    }
  };

  const testOpenAI = async (apiKey: string, model: string): Promise<boolean> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello! This is a connection test.' }],
        max_tokens: 10
      })
    });
    return response.ok;
  };

  const testClaude = async (apiKey: string, model: string): Promise<boolean> => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello! This is a connection test.' }]
      })
    });
    return response.ok;
  };

  const testGrok = async (apiKey: string, model: string): Promise<boolean> => {
    // Note: xAI API might have different endpoints/requirements
    // This is a placeholder - adjust based on actual xAI API documentation
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'grok-beta',
        messages: [{ role: 'user', content: 'Hello! This is a connection test.' }],
        max_tokens: 10
      })
    });
    return response.ok;
  };

  const handleConfigChange = (providerId: string, field: string, value: string | boolean) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        provider: providerId,
        [field]: value
      }
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'testing':
        return <Badge className="bg-yellow-100 text-yellow-800"><Zap className="w-3 h-3 mr-1" />Testing...</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to configure AI providers.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            AI Provider Settings
          </h2>
          <p className="text-gray-600 mt-1">Configure API keys for enhanced AI capabilities</p>
        </div>
      </div>

      <Tabs value={activeProvider} onValueChange={setActiveProvider}>
        <TabsList className="grid w-full grid-cols-3">
          {providers.map((provider) => (
            <TabsTrigger key={provider.id} value={provider.id} className="flex items-center gap-2">
              {provider.name}
              {getStatusBadge(provider.status)}
            </TabsTrigger>
          ))}
        </TabsList>

        {providers.map((provider) => (
          <TabsContent key={provider.id} value={provider.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    {provider.name} Configuration
                  </div>
                  {getStatusBadge(provider.status)}
                </CardTitle>
                <p className="text-gray-600">{provider.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${provider.id}-api-key`}>API Key</Label>
                    <div className="relative">
                      <Input
                        id={`${provider.id}-api-key`}
                        type={showApiKeys[provider.id] ? 'text' : 'password'}
                        value={configs[provider.id]?.apiKey || ''}
                        onChange={(e) => handleConfigChange(provider.id, 'apiKey', e.target.value)}
                        placeholder={provider.apiKeyPlaceholder}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      >
                        {showApiKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${provider.id}-model`}>Default Model</Label>
                    <Select
                      value={configs[provider.id]?.model || provider.models[0]}
                      onValueChange={(value) => handleConfigChange(provider.id, 'model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {provider.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {provider.endpoint && (
                  <div className="space-y-2">
                    <Label>API Endpoint</Label>
                    <Input value={provider.endpoint} disabled className="bg-gray-50" />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => testConnection(provider.id)}
                    disabled={!configs[provider.id]?.apiKey || testingProvider === provider.id}
                    variant="outline"
                  >
                    {testingProvider === provider.id ? (
                      <>
                        <Zap className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => saveAIConfig(provider.id, {
                      provider: provider.id,
                      apiKey: configs[provider.id]?.apiKey || '',
                      model: configs[provider.id]?.model || provider.models[0],
                      enabled: true
                    })}
                    disabled={!configs[provider.id]?.apiKey}
                  >
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use AI Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">🔑 Getting API Keys:</h4>
              <ul className="space-y-1 ml-4">
                <li><strong>OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">platform.openai.com</a></li>
                <li><strong>Claude:</strong> Visit <a href="https://console.anthropic.com/" target="_blank" className="text-blue-600 hover:underline">console.anthropic.com</a></li>
                <li><strong>Grok:</strong> Visit <a href="https://x.ai/" target="_blank" className="text-blue-600 hover:underline">x.ai</a> (when available)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🚀 Features Enabled:</h4>
              <ul className="space-y-1 ml-4">
                <li>• Enhanced natural language data analysis</li>
                <li>• AI-powered decision recommendations</li>
                <li>• Intelligent data correlation detection</li>
                <li>• Advanced semantic entity extraction</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

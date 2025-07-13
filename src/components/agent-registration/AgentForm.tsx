
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AGENT_CATEGORIES, AUTH_METHODS, COMMUNICATION_METHODS, PAYLOAD_FORMATS } from './constants';
import { FormData } from './types';

interface AgentFormProps {
  formData: FormData;
  onInputChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGenerateApiKey: () => void;
}

export function AgentForm({ formData, onInputChange, onSubmit, onGenerateApiKey }: AgentFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>+ Register New Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => onInputChange('name', e.target.value)}
                  placeholder="e.g., Custom Weather API"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => onInputChange('category', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {AGENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => onInputChange('description', e.target.value)}
                placeholder="Describe what this agent does and what data it provides"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => onInputChange('version', e.target.value)}
                  placeholder="1.0.0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => onInputChange('tags', e.target.value)}
                  placeholder="e.g., weather, api, real-time"
                />
              </div>
            </div>
          </div>

          {/* Communication Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Communication Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="communicationMethod">Communication Method</Label>
                <select
                  id="communicationMethod"
                  value={formData.communicationMethod}
                  onChange={(e) => onInputChange('communicationMethod', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {COMMUNICATION_METHODS.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payloadFormat">Data Format</Label>
                <select
                  id="payloadFormat"
                  value={formData.payloadFormat}
                  onChange={(e) => onInputChange('payloadFormat', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {PAYLOAD_FORMATS.map(format => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Endpoint URL *</Label>
              <Input
                id="webhookUrl"
                value={formData.webhookUrl}
                onChange={(e) => onInputChange('webhookUrl', e.target.value)}
                placeholder="https://your-agent.com/endpoint"
                type="url"
                required
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Authentication</h3>
            
            <div className="space-y-2">
              <Label htmlFor="authMethod">Authentication Method</Label>
              <select
                id="authMethod"
                value={formData.authMethod}
                onChange={(e) => onInputChange('authMethod', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {AUTH_METHODS.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key / Token</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={(e) => onInputChange('apiKey', e.target.value)}
                  placeholder="Your API key or token"
                  type="password"
                />
                <Button type="button" onClick={onGenerateApiKey} variant="outline">
                  🔑 Generate
                </Button>
              </div>
            </div>
          </div>

          {/* Data Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Data Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="dataTypes">Data Types (comma-separated) *</Label>
              <Input
                id="dataTypes"
                value={formData.dataTypes}
                onChange={(e) => onInputChange('dataTypes', e.target.value)}
                placeholder="e.g., temperature, humidity, predictions, metrics"
                required
              />
            </div>
          </div>

          {/* Advanced Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Advanced Configuration (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="customHeaders">Custom Headers (JSON format)</Label>
              <Textarea
                id="customHeaders"
                value={formData.customHeaders}
                onChange={(e) => onInputChange('customHeaders', e.target.value)}
                placeholder='{"X-Custom-Header": "value", "Authorization": "Bearer token"}'
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customConfig">Custom Configuration (JSON format)</Label>
              <Textarea
                id="customConfig"
                value={formData.customConfig}
                onChange={(e) => onInputChange('customConfig', e.target.value)}
                placeholder='{"timeout": 5000, "retries": 3, "custom_param": "value"}'
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Register Agent
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

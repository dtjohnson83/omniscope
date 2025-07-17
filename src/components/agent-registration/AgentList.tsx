
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Agent } from '@/hooks/useAgentOperations';

interface AgentListProps {
  agents: Agent[];
  testingAgent: string | null;
  onTestConnection: (agentId: string) => void;
  onToggleStatus: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
}

export function AgentList({ agents, testingAgent, onTestConnection, onToggleStatus, onDeleteAgent }: AgentListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>👥 Your Registered Agents</CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No agents registered yet. Click "Register Agent" to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{agent.name}</h3>
                      <Badge variant="secondary">{agent.category}</Badge>
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {agent.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(agent.tags?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(agent.tags?.length || 0) - 3} more
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      <div><strong>Endpoint:</strong> {agent.webhook_url}</div>
                      <div><strong>Communication:</strong> {agent.communication_method} | {agent.payload_format}</div>
                      <div><strong>Created:</strong> {new Date(agent.created_at || '').toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTestConnection(agent.id)}
                      disabled={testingAgent === agent.id}
                    >
                      {testingAgent === agent.id ? '🔄 Testing...' : '🧪 Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleStatus(agent.id)}
                    >
                      {agent.status === 'active' ? '⏸️ Disable' : '▶️ Enable'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteAgent(agent.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

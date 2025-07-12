import React, { useState } from 'react';

export default function AgentRegistrationSystem() {
  const [activeView, setActiveView] = useState<'register' | 'manage'>('register');
  const [agents, setAgents] = useState([
    {
      id: '1',
      name: 'Weather API',
      description: 'Provides weather data',
      status: 'active'
    }
  ]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-blue-600 text-center mb-8">
        Agent Registration System
      </h1>

      {/* Simple Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveView('register')}
          className={`px-4 py-2 rounded ${activeView === 'register' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Register Agent
        </button>
        <button
          onClick={() => setActiveView('manage')}
          className={`px-4 py-2 rounded ${activeView === 'manage' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Manage Agents
        </button>
      </div>

      {/* Register View */}
      {activeView === 'register' && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Register New Agent</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Agent Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="Enter agent name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Describe your agent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Webhook URL</label>
              <input
                type="url"
                className="w-full p-2 border rounded"
                placeholder="https://your-agent.com/webhook"
              />
            </div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Register Agent
            </button>
          </div>
        </div>
      )}

      {/* Manage View */}
      {activeView === 'manage' && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Registered Agents</h2>
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="border p-4 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className="text-gray-600">{agent.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

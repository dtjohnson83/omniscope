
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Bot, Database, Zap } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-indigo-800 mb-4">
            Universal Data Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Process JSON data with advanced visualizations and manage AI agents in one unified platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-indigo-300">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-indigo-100 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <BarChart3 className="w-10 h-10 text-indigo-600" />
              </div>
              <CardTitle className="text-2xl text-indigo-800">JSON Data Processor</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Advanced JSON processing with interactive visualizations, statistical summaries, 
                and multiple chart types. Upload files, format data, and export results.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Charts</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Statistics</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Export</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">Upload</span>
              </div>
              <Link to="/data-processor">
                <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                  <Zap className="w-4 h-4 mr-2" />
                  Process Data
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Bot className="w-10 h-10 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-800">Agent Registration</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Register and manage AI agents, APIs, and data sources. Configure authentication, 
                webhooks, and communication protocols for seamless integration.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">APIs</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Webhooks</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Auth</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">Manage</span>
              </div>
              <Link to="/agent-registration">
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                  <Database className="w-4 h-4 mr-2" />
                  Manage Agents
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Platform Features</h2>
            <p className="text-gray-600">Everything you need for data processing and agent management</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Rich Visualizations</h3>
              <p className="text-sm text-gray-600">Bar charts, line graphs, pie charts, and scatter plots</p>
            </div>
            
            <div className="text-center p-4">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Agent Management</h3>
              <p className="text-sm text-gray-600">Register, configure, and monitor your AI agents</p>
            </div>
            
            <div className="text-center p-4">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Secure Storage</h3>
              <p className="text-sm text-gray-600">Supabase integration for reliable data persistence</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

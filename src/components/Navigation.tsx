
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, BarChart3, Bot } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">UDP</span>
            </div>
            <span className="font-bold text-gray-800">Universal Data Platform</span>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Link to="/">
              <Button 
                variant={isActive('/') ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            
            <Link to="/data-processor">
              <Button 
                variant={isActive('/data-processor') ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Data Processor
              </Button>
            </Link>
            
            <Link to="/agents">
              <Button 
                variant={isActive('/agents') ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Agents
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

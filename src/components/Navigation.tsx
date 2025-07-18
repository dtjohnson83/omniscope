// src/components/Navigation.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: '🏠 Dashboard',
      icon: '🏠'
    },
    {
      to: '/data-processor',
      label: '🧠 AI Data Processor',
      icon: '🧠'
    },
    {
      to: '/api-agents',
      label: '🤖 Agents',
      icon: '🤖'
    },
    {
      to: '/ai-settings',
      label: '⚙️ AI Settings',
      icon: '⚙️'
    }
  ];

  return (
    <nav className="flex items-center space-x-1">
      {/* Logo/Brand */}
      <Link 
        to="/" 
        className="flex items-center space-x-2 mr-6 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">UDP</span>
        </div>
        <span className="font-semibold text-gray-900 hidden sm:block">Universal Data Platform</span>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center space-x-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-100 text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span className="hidden sm:block">{item.label.split(' ').slice(1).join(' ')}</span>
              <span className="sm:hidden">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Status Indicator */}
      <div className="ml-4 flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-500 hidden md:block">Platform Online</span>
      </div>
    </nav>
  );
};

export default Navigation;

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { agentRunner } from './lib/agentRunner';
import Dashboard from './pages/Dashboard';
import DataProcessor from './components/DataProcessor';
import AgentRegistrationSystem from './components/AgentRegistrationSystem';

function App() {
  useEffect(() => {
    // Start the agent runner when app loads
    agentRunner.startScheduler();
    
    return () => {
      // Optional: Add cleanup if needed
      console.log('App unmounting - agent runner continues in background');
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-processor" element={<DataProcessor />} />
          <Route path="/agent-registration" element={<AgentRegistrationSystem />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;


import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from './pages/Dashboard';
import DataProcessor from './components/DataProcessor';
import AgentRegistrationSystem from './components/AgentRegistrationSystem';

function App() {
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

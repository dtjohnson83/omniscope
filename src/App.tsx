import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthForm } from './components/Auth';
import { Button } from '@/components/ui/button'; // shadcn-ui import
import Dashboard from './components/Dashboard'; // Assume this exists or create a placeholder
import DataProcessor from './components/DataProcessor'; // Assume this exists
import AgentRegistrationSystem from './components/AgentRegistrationSystem'; // Import here if it's the full Agents page

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  if (!user) {
    return <AuthForm onAuthSuccess={() => supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-white">
        <nav className="flex justify-between items-center p-4 bg-blue-50 border-b">
          <h1 className="text-xl font-bold text-blue-800">Universal Data Platform</h1>
          <div className="space-x-4">
            <a href="/" className="text-blue-600 hover:underline">Dashboard</a>
            <a href="/data-processor" className="text-blue-600 hover:underline">Data Processor</a>
            <a href="/agents" className="text-blue-600 hover:underline">Agents</a>
          </div>
          <div className="flex items-center space-x-2">
            <span>👤 {user.email}</span>
            <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
          </div>
        </nav>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data-processor" element={<DataProcessor />} />
            <Route path="/agents" element={<AgentRegistrationSystem />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

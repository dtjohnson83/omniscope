import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthForm } from './components/Auth';
import { Button } from '@/components/ui/button';
import Dashboard from './pages/Dashboard'; // Actual location: src/pages/Dashboard.tsx
import DataProcessor from './components/DataProcessor'; // Actual location: src/components/DataProcessor.tsx
import AgentRegistrationSystem from './components/AgentRegistrationSystem'; // Actual location: src/components/AgentRegistrationSystem.tsx

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        setError('Auth error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      setError('Logout error: ' + err.message);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;

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
            <Route path="*" element={<div className="text-center text-red-500">404 - Page Not Found</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

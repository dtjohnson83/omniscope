// src/App.tsx
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from './components/Auth';
import { Button } from '@/components/ui/button';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import EnhancedDataProcessor from './components/EnhancedDataProcessor';
import UniversalAPIAgent from './components/UniversalAPIAgent';
import { AISettings } from './components/AISettings';

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
        console.error('Auth error:', err);
        setError('Authentication error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setError(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">Error</p>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => window.location.reload()} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Navigation />
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  👤 {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-6xl mx-auto p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data-processor" element={<EnhancedDataProcessor />} />
            <Route path="/api-agents" element={<UniversalAPIAgent />} />
            <Route path="/ai-settings" element={<AISettings />} />
            <Route path="*" element={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">404 - Page Not Found</h2>
                <p className="text-gray-600">The page you're looking for doesn't exist.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

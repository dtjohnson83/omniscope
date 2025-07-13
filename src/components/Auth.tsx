// src/components/Auth.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase'; // Your Supabase client
import { Input, Button, Label } from '@/components/ui'; // shadcn-ui

export function AuthForm({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setError(null);
    try {
      const { data, error } = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) onAuthSuccess(); // e.g., redirect or refresh
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Label htmlFor="password">Password</Label>
      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button onClick={handleAuth}>{isSignup ? 'Sign Up' : 'Sign In'}</Button>
      <Button variant="link" onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
      </Button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}

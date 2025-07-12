import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AgentRegistrationSystem() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-blue-600 text-center mb-8">
        Agent Registration System
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Simple Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Testing basic components...</p>
          <Button>Test Button</Button>
        </CardContent>
      </Card>
    </div>
  );
}

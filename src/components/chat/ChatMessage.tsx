import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot, TrendingUp } from 'lucide-react';
import { DynamicChartGenerator } from './DynamicChartGenerator';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: any;
  chartType?: string;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  return (
    <div className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback>
          {message.type === 'user' ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col max-w-[80%] ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
        <Card className={`${
          message.type === 'user' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <CardContent className="p-3">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </CardContent>
        </Card>

        {message.chartData && message.chartType && (
          <div className="mt-2 w-full max-w-md">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Generated Visualization</span>
                </div>
                <DynamicChartGenerator 
                  data={message.chartData} 
                  chartType={message.chartType} 
                />
              </CardContent>
            </Card>
          </div>
        )}

        <span className="text-xs text-muted-foreground mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};
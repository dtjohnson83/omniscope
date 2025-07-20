import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './chat/ChatMessage';
import { DynamicChartGenerator } from './chat/DynamicChartGenerator';
import { VoiceInterface } from './chat/VoiceInterface';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: any;
  chartType?: string;
}

interface ConversationContext {
  messages: Message[];
  currentDataset?: any;
  previousQueries: string[];
}

export const ConversationalInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    messages: [],
    currentDataset: null,
    previousQueries: []
  });
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const processQuery = async (query: string, isVoice: boolean = false) => {
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Update conversation context
      const updatedContext = {
        ...conversationContext,
        messages: [...messages, userMessage],
        previousQueries: [...conversationContext.previousQueries, query]
      };

      // Call AI service to process the query
      const response = await supabase.functions.invoke('process-conversational-query', {
        body: {
          query,
          context: updatedContext,
          includeCharts: true,
          voiceResponse: isVoice
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { textResponse, chartData, chartType, audioResponse } = response.data;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: textResponse,
        timestamp: new Date(),
        chartData,
        chartType
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConversationContext(updatedContext);

      // Play audio response if voice mode is active
      if (isVoice && audioResponse) {
        const audio = new Audio(`data:audio/mp3;base64,${audioResponse}`);
        audio.play();
      }

    } catch (error) {
      console.error('Error processing query:', error);
      toast({
        title: "Error",
        description: "Failed to process your question. Please try again.",
        variant: "destructive"
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error processing your question. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const handleSendMessage = () => {
    processQuery(inputValue, isVoiceMode);
  };

  const handleVoiceQuery = (transcript: string) => {
    processQuery(transcript, true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationContext({
      messages: [],
      currentDataset: null,
      previousQueries: []
    });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Conversational Data Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={isVoiceMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className="flex items-center gap-2"
              >
                {isVoiceMode ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {isVoiceMode ? 'Voice On' : 'Voice Off'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
              >
                Clear
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask questions about your data and get insights with dynamic visualizations
          </p>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg mb-2">Welcome to Conversational Data Analysis!</p>
                  <p className="text-sm">
                    Ask questions like "Show me sales trends by region" or "What are the key insights from the latest data?"
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
              {isLoading && (
                <div className="flex justify-center py-4">
                  <div className="animate-pulse text-muted-foreground">
                    Analyzing your question...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          <div className="p-6">
            {isVoiceMode ? (
              <VoiceInterface onTranscript={handleVoiceQuery} />
            ) : (
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your data..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
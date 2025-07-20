import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInterfaceProps {
  onTranscript: (transcript: string) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks to turn off microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Speak your question now",
      });

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Call speech-to-text service
        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio: base64Audio }),
        });

        if (!response.ok) {
          throw new Error('Speech recognition failed');
        }

        const { text } = await response.json();
        
        if (text && text.trim()) {
          onTranscript(text.trim());
          toast({
            title: "Speech Recognized",
            description: `"${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
          });
        } else {
          toast({
            title: "No Speech Detected",
            description: "Please try speaking more clearly",
            variant: "destructive"
          });
        }
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process speech. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={isProcessing}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white rounded-full h-12 w-12 p-0"
          >
            <Mic className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            size="lg"
            variant="destructive"
            className="rounded-full h-12 w-12 p-0 animate-pulse"
          >
            <Square className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="text-center">
        {isRecording && (
          <p className="text-sm text-muted-foreground animate-pulse">
            🎤 Recording... Click stop when done
          </p>
        )}
        {isProcessing && (
          <p className="text-sm text-muted-foreground">
            Processing speech...
          </p>
        )}
        {!isRecording && !isProcessing && (
          <p className="text-sm text-muted-foreground">
            Click the microphone to start recording
          </p>
        )}
      </div>
    </div>
  );
};
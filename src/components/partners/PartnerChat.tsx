'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Sparkles, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  partnerId: string;
  partnerName: string;
}

const STARTER_PROMPTS = [
  "Что тебе больше всего нравится?",
  "Есть что-то новое что хочешь попробовать?",
  "Как относишься к игрушкам?",
  "Тебе нравится когда я доминирую?",
];

export function PartnerChat({ partnerId, partnerName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/partner-chat/history?partnerId=${partnerId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [partnerId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function clearHistory() {
    try {
      await fetch(`/api/partner-chat/history?partnerId=${partnerId}`, {
        method: 'DELETE'
      });
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput('');
    setIsLoading(true);

    // Optimistically add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const res = await fetch('/api/partner-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, message: messageText })
      });

      const data = await res.json();

      if (data.message) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[500px] bg-muted/30 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background rounded-t-lg">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {partnerName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{partnerName}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI-аватар на основе ответов
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearHistory}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary/60" />
            <p className="text-muted-foreground mb-4">
              Спроси что-нибудь о предпочтениях {partnerName}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(prompt)}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-background border rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-background border px-4 py-2 rounded-2xl rounded-bl-md">
              <span className="animate-pulse text-muted-foreground">печатает...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background rounded-b-lg">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Спроси о предпочтениях..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

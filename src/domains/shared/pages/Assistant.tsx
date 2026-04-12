import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Sparkles, Book, Zap, Loader2, Bot } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/integrations/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your Guardian Flow AI assistant. I can help with field service troubleshooting, work order analysis, SLA risk, repair procedures, and more. How can I help you today?',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsStreaming(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    abortRef.current = new AbortController();
    const token = localStorage.getItem('auth_session')
      ? JSON.parse(localStorage.getItem('auth_session')!).access_token
      : null;

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history, stream: true }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.done) {
              if (payload.provider) setProvider(payload.provider);
              break;
            }
            if (payload.token) {
              accumulated += payload.token;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
                return next;
              });
            }
          } catch { /* skip malformed */ }
        }
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: accumulated || 'No response received.', streaming: false };
        return next;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: 'An error occurred while contacting the AI service. Please try again.',
          streaming: false,
        };
        return next;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const suggestedQuestions = [
    'Summarize the top SLA breach risks this week',
    'What are the symptoms of a failing power supply in Dell OptiPlex?',
    'How do I replace a fuser assembly on HP LaserJet Pro?',
    'Which technicians are closest to open urgent work orders?',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-muted-foreground">Guardian Flow intelligent assistant — field service, analytics, and operations</p>
        </div>
        <div className="flex items-center gap-2">
          {provider && (
            <Badge variant="outline" className="text-xs">
              {provider === 'openai' ? '🟢 OpenAI GPT-4o' : '🔵 Mock AI'}
            </Badge>
          )}
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
            <Sparkles className="mr-1 h-3 w-3" />
            RAG-Powered
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Chat with Assistant
            </CardTitle>
            <CardDescription>Ask questions about operations, devices, repairs, and analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[420px] border rounded-lg bg-muted/20 p-4" ref={scrollRef as React.RefObject<HTMLDivElement>}>
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                placeholder="Ask about SLA risks, work order status, technician availability, or device issues..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                disabled={isStreaming}
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                className="h-auto"
                disabled={isStreaming || !inputMessage.trim()}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Suggested Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestedQuestions.map((question, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-3"
                onClick={() => setInputMessage(question)}
                disabled={isStreaming}
              >
                <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-xs">{question}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            How It Works
          </CardTitle>
          <CardDescription>Retrieval-Augmented Generation + LLM pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-card">
              <p className="font-semibold mb-2">Retrieval Phase</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Vector similarity search on KB embeddings</li>
                <li>• Hybrid search (semantic + keyword)</li>
                <li>• Contextual re-ranking</li>
                <li>• Top-k relevant chunks retrieved</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg bg-card">
              <p className="font-semibold mb-2">Generation Phase</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Prompt augmentation with retrieved context</li>
                <li>• OpenAI GPT-4o (or mock fallback)</li>
                <li>• Streaming token delivery via SSE</li>
                <li>• Decision logged to FlowSpace ledger</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

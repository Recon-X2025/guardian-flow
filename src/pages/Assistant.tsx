import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Sparkles, Book, AlertCircle, Zap } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function Assistant() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your PC & Print field service assistant. I can help you with troubleshooting, repair procedures, part recommendations, and warranty information. How can I assist you today?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');

    // Mock AI response (in production, this would call RAG engine)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I understand you need help with that. In production, this assistant would be powered by the RAG engine, providing contextual answers from the knowledge base with citations. Please connect the RAG engine to enable AI-powered assistance.'
      }]);
    }, 1000);
  };

  const suggestedQuestions = [
    'How do I replace a fuser assembly on HP LaserJet Pro?',
    'What are the symptoms of a failing power supply in Dell OptiPlex?',
    'Brother MFC drum unit installation steps',
    'Toner cartridge compatibility for Canon imageRUNNER',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-muted-foreground">Contextual help for PC & Print field service technicians</p>
        </div>
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
          <Sparkles className="mr-1 h-3 w-3" />
          RAG-Powered
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chat with Assistant</CardTitle>
            <CardDescription>Ask questions about devices, repairs, and procedures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[400px] overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/20">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Ask about device issues, repair procedures, or part recommendations..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
              />
              <Button onClick={handleSendMessage} size="icon" className="h-auto">
                <Send className="h-4 w-4" />
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
            RAG Engine Integration
          </CardTitle>
          <CardDescription>Connect to Retrieval-Augmented Generation pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The AI Assistant uses RAG (Retrieval-Augmented Generation) to provide accurate, citation-backed answers:
            </p>
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
                  <li>• Model selection (Gemini 2.5 Flash via Lovable AI)</li>
                  <li>• Citation extraction and linking</li>
                  <li>• Provenance tracking (model_version, prompt_id)</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Implementation Status</p>
                <p className="text-xs text-muted-foreground">
                  RAG engine requires vector DB and embedding pipeline. Mock responses shown above.
                  To enable full functionality, provision vector DB and configure embedding model.
                  See <code className="px-1 py-0.5 rounded bg-card">docs/INFRASTRUCTURE_REQUIREMENTS.md</code>.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

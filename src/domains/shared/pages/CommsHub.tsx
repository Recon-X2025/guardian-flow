import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, MessageSquare, Send, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  channel: string;
  created_at: string;
  sent_by?: string;
}

interface Thread {
  id: string;
  customer_id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  status: string;
  last_message_at?: string;
  message_count: number;
  messages: Message[];
}

const MESSAGE_TEMPLATES = [
  { id: 'appointment_reminder', label: 'Appointment Reminder', body: 'This is a reminder that you have a scheduled appointment tomorrow. Please confirm your availability.' },
  { id: 'job_complete', label: 'Job Completed', body: 'Great news! Your service has been completed. Please let us know if you have any questions or concerns.' },
  { id: 'invoice_ready', label: 'Invoice Ready', body: 'Your invoice is ready for review. Please log in to your portal to view and pay.' },
  { id: 'followup_csat', label: 'CSAT Follow-up', body: 'We hope you were satisfied with our service! We would love your feedback. How would you rate your experience?' },
];

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  sms: 'bg-green-100 text-green-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-3 h-3" />,
  sms: <MessageSquare className="w-3 h-3" />,
  whatsapp: <MessageSquare className="w-3 h-3" />,
};

export default function CommsHub() {
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  // New message / reply state
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  // New thread compose state
  const [composing, setComposing] = useState(false);
  const [newChannel, setNewChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [newRecipient, setNewRecipient] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');

  // In a real app we'd paginate threads from a customer list.
  // Here we fetch threads for a demo customer to seed the inbox.
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      // Threads are tenant-wide; using a broad endpoint for demonstration.
      // In production, you'd have a GET /api/comms/threads (all threads for tenant).
      // For now, fetch all threads by iterating recent customer IDs or use a tenant-wide query.
      setThreads([]);
    } catch {
      toast({ title: 'Error', description: 'Could not load threads.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleSendReply = async () => {
    if (!selectedThread || !replyBody.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/api/comms/threads/${selectedThread.id}/reply`, {
        message: replyBody,
      });
      setReplyBody('');
      // Optimistically add the message
      const newMsg: Message = {
        id: `tmp-${Date.now()}`,
        direction: 'outbound',
        body: replyBody,
        channel: selectedThread.channel,
        created_at: new Date().toISOString(),
      };
      setSelectedThread(prev =>
        prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev,
      );
      toast({ title: 'Reply sent' });
    } catch {
      toast({ title: 'Error', description: 'Failed to send reply.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleSendNew = async () => {
    if (!newRecipient.trim() || !newBody.trim()) {
      toast({ title: 'Required', description: 'Recipient and message are required.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const result = await apiClient.post('/api/comms/send', {
        channel: newChannel,
        recipient: newRecipient,
        message: newBody,
        subject: newSubject || undefined,
        customerId: newCustomerId || undefined,
      });
      toast({ title: 'Message sent', description: `Thread ${result.threadId}` });
      setComposing(false);
      setNewRecipient('');
      setNewSubject('');
      setNewBody('');
      setNewCustomerId('');
      fetchThreads();
    } catch {
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const tpl = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (tpl) setReplyBody(tpl.body);
  };

  const filteredThreads = threads.filter(t => {
    const matchesChannel = channelFilter === 'all' || t.channel === channelFilter;
    const matchesSearch =
      !search ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.customer_id?.toLowerCase().includes(search.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel — thread list */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-4 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Inbox</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={fetchThreads} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={() => setComposing(true)}>
                <Send className="w-3 h-3 mr-1" /> New
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search threads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Channel filter */}
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {threads.length === 0
                ? 'No threads yet. Start a new conversation.'
                : 'No threads match your filter.'}
            </div>
          ) : (
            filteredThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${
                  selectedThread?.id === thread.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-medium truncate">
                    {thread.subject || `Thread ${thread.id.slice(0, 8)}`}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-xs flex items-center gap-1 shrink-0 ${CHANNEL_COLORS[thread.channel] || ''}`}
                  >
                    {CHANNEL_ICONS[thread.channel]}
                    {thread.channel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}
                  {thread.last_message_at
                    ? ` · ${new Date(thread.last_message_at).toLocaleDateString()}`
                    : ''}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — conversation view or compose */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {composing ? (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">New Message</h3>
              <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Channel</label>
                <Select
                  value={newChannel}
                  onValueChange={v => setNewChannel(v as 'email' | 'sms' | 'whatsapp')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Recipient *</label>
                <Input
                  value={newRecipient}
                  onChange={e => setNewRecipient(e.target.value)}
                  placeholder={newChannel === 'email' ? 'email@example.com' : '+1 555 000 0000'}
                  className="mt-1"
                />
              </div>
            </div>

            {newChannel === 'email' && (
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Customer ID (optional)</label>
              <Input
                value={newCustomerId}
                onChange={e => setNewCustomerId(e.target.value)}
                placeholder="customer-uuid"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Message *</label>
                <Select onValueChange={tId => {
                  const tpl = MESSAGE_TEMPLATES.find(t => t.id === tId);
                  if (tpl) setNewBody(tpl.body);
                }}>
                  <SelectTrigger className="h-7 w-44 text-xs">
                    <SelectValue placeholder="Use template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                rows={6}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Type your message..."
              />
            </div>

            <Button onClick={handleSendNew} disabled={sending} className="w-full">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Message
            </Button>
          </div>
        ) : selectedThread ? (
          <>
            {/* Thread header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {selectedThread.subject || `Thread ${selectedThread.id.slice(0, 8)}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Customer: {selectedThread.customer_id || 'Unknown'}
                  {' · '}
                  <Badge
                    variant="outline"
                    className={`text-xs ${CHANNEL_COLORS[selectedThread.channel] || ''}`}
                  >
                    {selectedThread.channel}
                  </Badge>
                </p>
              </div>
              <Badge variant="outline" className="text-xs">{selectedThread.status}</Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedThread.messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No messages in this thread.</p>
              ) : (
                selectedThread.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{msg.body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            <div className="border-t p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Reply via {selectedThread.channel}</span>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger className="h-7 w-40 text-xs">
                    <SelectValue placeholder="Templates..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  rows={2}
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Type a reply..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSendReply();
                    }
                  }}
                />
                <Button onClick={handleSendReply} disabled={sending || !replyBody.trim()} size="icon">
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Ctrl+Enter to send</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
              <p>Select a thread or start a new conversation</p>
              <Button onClick={() => setComposing(true)} variant="outline">
                <Send className="w-4 h-4 mr-2" /> New Message
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

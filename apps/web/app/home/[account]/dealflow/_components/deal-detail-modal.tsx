'use client';

import { useEffect, useRef, useState } from 'react';

import {
  AlertCircle,
  Calendar,
  CheckSquare,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  Send,
  Target,
  X,
} from 'lucide-react';
import { Bot, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@kit/ui/avatar';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { cn } from '@kit/ui/utils';

interface Deal {
  id: string;
  companyName: string;
  industry: string;
  value: string;
  contact: string;
  email: string;
  stage: 'lead' | 'contacted' | 'meeting' | 'closed';
  createdAt: string;
  painPoints?: string[];
  nextSteps?: string[];
  companySize?: string;
  website?: string;
  dealTitle?: string;
  nextAction?: string;
  relationshipInsights?: string;
}

interface DealDetailModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function DealDetailModal({
  deal,
  isOpen,
  onClose,
}: DealDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI conversation when modal opens
  useEffect(() => {
    if (isOpen && deal) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: `Hi! I'm here to help you with the ${deal.companyName} deal. I can help you draft emails, schedule meetings, or provide insights about this opportunity. What would you like to do?`,
          timestamp: new Date(),
        },
      ]);
      setActiveTab('details');
    }
  }, [isOpen, deal]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatCurrency = (value: string) => {
    // Remove $ and commas, then parse
    const numValue = Number.parseInt(value.replace(/[$,]/g, ''));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'lead':
        return 'bg-blue-500/20 text-blue-400';
      case 'contacted':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'meeting':
        return 'bg-purple-500/20 text-purple-400';
      case 'closed':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let aiResponse = '';

      if (input.toLowerCase().includes('email')) {
        aiResponse = `I'll help you draft an email for ${deal?.contact}. Here's a template based on their pain points:\n\nSubject: Addressing ${deal?.companyName}'s Sales Challenges\n\nHi ${deal?.contact?.split(' ')[0]},\n\nFollowing up on our conversation about ${deal?.painPoints?.[0] || 'your sales challenges'}. I wanted to share how VELLORA.AI can help...\n\nWould you like me to customize this further?`;
      } else if (
        input.toLowerCase().includes('meeting') ||
        input.toLowerCase().includes('schedule')
      ) {
        aiResponse = `I can help schedule a meeting with ${deal?.contact}. Based on their engagement history, Tuesday or Thursday afternoons tend to work best. Would you like me to:\n\n1. Send a calendar invite for next Tuesday at 2 PM?\n2. Draft a meeting request email?\n3. Check your calendar for availability?`;
      } else if (
        input.toLowerCase().includes('insight') ||
        input.toLowerCase().includes('advice')
      ) {
        aiResponse = `Based on my analysis of ${deal?.companyName}:\n\n• They're in the ${deal?.industry} sector with ${deal?.companySize || '500-1000 employees'}\n• Key decision maker: ${deal?.contact}\n• Main pain point: ${deal?.painPoints?.[0] || 'Manual sales processes'}\n\nRecommendation: Focus on ROI and time savings in your next conversation. Companies like this typically see 40% efficiency gains with our solution.`;
      } else {
        aiResponse = `I understand you're asking about "${input}". For the ${deal?.companyName} deal, I can help with:\n\n• Drafting personalized emails\n• Scheduling meetings\n• Providing deal insights\n• Creating proposals\n• Analyzing win probability\n\nWhat specific assistance do you need?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  if (!deal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="fixed inset-4 m-auto max-h-[calc(100vh-3rem)] w-[95vw] max-w-4xl overflow-hidden border-gray-700 bg-gray-900 p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle>Deal Details</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="from-designer-violet to-designer-blue h-12 w-12 bg-gradient-to-br md:h-12 md:w-12">
              <AvatarFallback className="text-lg font-semibold">
                {deal.companyName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-monument text-xl md:text-2xl">
                {deal.companyName}
              </h2>
              <p className="text-sm text-gray-400">
                {deal.dealTitle || `${deal.industry} Opportunity`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabbed Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex h-[calc(100%-88px)] flex-1 flex-col"
        >
          <TabsList className="mx-6 mt-4 border-gray-700 bg-gray-800">
            <TabsTrigger value="details">Deal Details</TabsTrigger>
            <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent
            value="details"
            className="flex-1 space-y-6 overflow-y-auto p-6"
          >
            {/* Deal Value & Status Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="glassmorphism rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/20 p-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Deal Value</p>
                    <p className="text-xl font-semibold text-green-400">
                      {formatCurrency(deal.value)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glassmorphism rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-500/20 p-2">
                    <Target className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Current Status</p>
                    <Badge className={cn('mt-1', getStageColor(deal.stage))}>
                      {deal.stage.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Action Section */}
            {deal.nextAction && (
              <div className="glassmorphism border-designer-violet rounded-lg border-l-4 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="mb-1 font-semibold">Next Action</h3>
                    <p className="text-gray-300">{deal.nextAction}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {deal.createdAt}
                  </span>
                </div>
              </div>
            )}

            {/* Pain Points */}
            {deal.painPoints && deal.painPoints.length > 0 && (
              <div className="glassmorphism rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  Pain Points
                </h3>
                <ul className="space-y-2">
                  {deal.painPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm md:text-base"
                    >
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <span className="text-gray-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {deal.nextSteps && deal.nextSteps.length > 0 && (
              <div className="glassmorphism rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <CheckSquare className="h-5 w-5 text-green-400" />
                  Next Steps
                </h3>
                <ul className="space-y-2">
                  {deal.nextSteps.map((step, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm md:text-base"
                    >
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                      <span className="text-gray-300">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Relationship Insights */}
            <div className="glassmorphism rounded-lg p-4">
              <h3 className="mb-3 font-semibold">Relationship Insights</h3>
              <p className="leading-relaxed text-gray-300">
                {deal.relationshipInsights ||
                  `${deal.contact} from ${deal.companyName} has shown strong interest in our AI-powered sales solutions. They've been particularly engaged with content about automation and efficiency gains. The ${deal.industry} sector is experiencing rapid digital transformation, making this an ideal time to position our solution. Consider emphasizing ROI metrics and implementation speed in your next interaction.`}
              </p>
            </div>

            {/* Contact Information */}
            <div className="glassmorphism rounded-lg p-4">
              <h3 className="mb-3 font-semibold">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  <span className="text-gray-400">Primary Contact:</span>{' '}
                  {deal.contact}
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-400">Email:</span> {deal.email}
                </p>
                {deal.website && (
                  <p className="text-gray-300">
                    <span className="text-gray-400">Website:</span>{' '}
                    {deal.website}
                  </p>
                )}
                {deal.companySize && (
                  <p className="text-gray-300">
                    <span className="text-gray-400">Company Size:</span>{' '}
                    {deal.companySize}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="ai-assistant"
            className="flex flex-1 flex-col p-6"
          >
            {/* Quick Actions */}
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setInput('Help me draft an email for this deal')}
              >
                <Mail className="h-4 w-4" /> Draft Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  setInput('Schedule a meeting with ' + deal.contact)
                }
              >
                <Calendar className="h-4 w-4" /> Schedule Meeting
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setInput('Give me insights about this deal')}
              >
                <FileText className="h-4 w-4" /> Deal Insights
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="mb-4 flex-1 space-y-4 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="bg-designer-violet/20 h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg p-3 whitespace-pre-wrap',
                      message.role === 'assistant'
                        ? 'glassmorphism text-white'
                        : 'bg-designer-violet/20 border-designer-violet/30 border text-white',
                    )}
                  >
                    {message.content}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="bg-designer-blue/20 h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start gap-3">
                  <Avatar className="bg-designer-violet/20 h-8 w-8 shrink-0">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="glassmorphism rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask AI about this deal..."
                className="focus-visible:ring-designer-violet/50 flex-1 border-gray-700 bg-gray-800"
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                className="bg-designer-violet hover:bg-designer-violet/90"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

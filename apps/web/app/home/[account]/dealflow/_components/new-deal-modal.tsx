'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import { Loader2, Send } from 'lucide-react';
import { Bot, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@kit/ui/avatar';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { cn } from '@kit/ui/utils';
import { cleanCompanyName } from '../_lib/utils';

// import { useToast } from '@kit/ui/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface DealFormData {
  companyWebsite?: string;
  companyName?: string;
  industry?: string;
  valueAmount?: string;
  valueCurrency?: string;
  contactName?: string;
  contactEmail?: string;
  companySummary?: string;
  companyDescription?: string;
  previousEmails?: any[];
  previousMeetings?: any[];
  websiteAnalysis?: string;
}

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDealCreated: (deal: any) => Promise<void>;
}

export default function NewDealModal({
  isOpen,
  onClose,
  onDealCreated,
}: NewDealModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dealData, setDealData] = useState<DealFormData>({});
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const params = useParams();
  // const { toast } = useToast();

  // Generate unique message ID
  const generateMessageId = () => {
    const newCounter = messageIdCounter + 1;
    setMessageIdCounter(newCounter);
    return `msg-${Date.now()}-${newCounter}-${Math.random().toString(36).substr(2, 5)}`;
  };

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && !isProcessing) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isProcessing]);

  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialMessage = {
        id: generateMessageId(),
        role: 'assistant' as const,
        content: "I'll help you create a new deal, what is the company website?",
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
      setCurrentQuestion('companyWebsite');
      setDealData({});
    }
  }, [isOpen, messages.length, generateMessageId]);

  const getNextQuestion = (
    data: DealFormData,
  ): { question: string; field: string } | null => {
    if (!data.companyWebsite) {
      return { question: "What is the company website?", field: 'companyWebsite' };
    }
    if (!data.contactName) {
      return { question: "What is the main contact's name?", field: 'contactName' };
    }
    if (!data.contactEmail) {
      return { question: "What is their email address?", field: 'contactEmail' };
    }
    return null;
  };

  const fetchCompanySummary = async (
    companyName: string,
  ): Promise<string | null> => {
    try {
      // Simple company info API call (you could use Clearbit, Apollo, or similar services)
      const response = await fetch(
        `/api/company-info?company=${encodeURIComponent(companyName)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          return data.summary;
        }
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
    return null;
  };

  const extractInfoFromMessage = (
    message: string,
    field: string,
  ): string | null => {
    const cleaned = message.trim();

    if (field === 'companyWebsite') {
      // Extract website from the message (don't use entire message)
      const websiteMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.)+[a-zA-Z]{2,}/);
      if (websiteMatch) {
        let website = websiteMatch[0];
        if (!website.startsWith('http')) {
          website = `https://${website}`;
        }
        return website;
      }
      // Fallback: if the entire input looks like a website, use it
      if (/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(cleaned)) {
        return cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
      }
      return null;
    }

    if (field === 'contactEmail') {
      const emailMatch = cleaned.match(/[\w.-]+@[\w.-]+\.\w+/);
      return emailMatch ? emailMatch[0] : cleaned;
    }

    if (field === 'valueAmount') {
      // Extract numbers, handle k/K for thousands, m/M for millions
      const numberMatch = cleaned.match(
        /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([kKmM])?/,
      );
      if (numberMatch && numberMatch[1]) {
        let value = parseFloat(numberMatch[1].replace(/,/g, ''));
        const suffix = numberMatch[2]?.toLowerCase();
        if (suffix === 'k') value *= 1000;
        if (suffix === 'm') value *= 1000000;
        return value.toString();
      }
      // If just a number
      const simpleNumber = cleaned.match(/^\d+(?:,\d{3})*(?:\.\d+)?$/);
      if (simpleNumber) {
        return cleaned.replace(/,/g, '');
      }
      // If no valid number found, return null instead of the raw text
      return null;
    }

    if (field === 'valueCurrency') {
      const currencyMatch = cleaned.match(
        /\b(USD|EUR|GBP|CAD|AUD|JPY|CHF|SEK|NOK|DKK)\b/i,
      );
      return currencyMatch && currencyMatch[1]
        ? currencyMatch[1].toUpperCase()
        : cleaned.toUpperCase();
    }



    return cleaned;
  };

  // Detect if user provided all info in one message
  const extractAllInfoFromMessage = (message: string): Partial<DealFormData> => {
    const extracted: Partial<DealFormData> = {};
    const cleanMessage = message.trim().toLowerCase();
    
    // Extract website (look for domain patterns)
    const websiteMatch = message.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.)+[a-zA-Z]{2,}/);
    if (websiteMatch) {
      extracted.companyWebsite = websiteMatch[0].startsWith('http') ? websiteMatch[0] : `https://${websiteMatch[0]}`;
    }

    // Extract email (standard email pattern)
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      extracted.contactEmail = emailMatch[0];
    }

    // Extract contact name (various patterns)
    const namePatterns = [
      // "contact is matt" or "contact is John Smith"
      /(?:contact|person|name)\s+(?:is|:)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
      // "the contact is matt"
      /the\s+contact\s+is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
      // "his name is John" or "her name is John"
      /(?:his|her|their)\s+(?:name|email)\s+is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
      // Look for names after common words (case insensitive)
      /(?:contact|person|name|reach|email|call)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
      // "John Smith at" or "John Smith from" 
      /([a-zA-Z]+\s+[a-zA-Z]+)(?:\s+(?:at|from|with|@))/i,
      // Single word names after contact-related words
      /(?:contact|person|name|reach|email|call)\s+([a-zA-Z]+)/i,
    ];
    
    // Common words to exclude from name matching
    const excludeWords = ['email', 'website', 'company', 'contact', 'person', 'name', 'at', 'com', 'org', 'net', 'his', 'her', 'their', 'the', 'is'];
    
    for (const pattern of namePatterns) {
      const nameMatch = message.match(pattern);
      if (nameMatch && nameMatch[1] && !nameMatch[1].includes('@') && !nameMatch[1].includes('.')) {
        // Make sure we didn't match an email or website
        const candidateName = nameMatch[1].trim();
        const nameLower = candidateName.toLowerCase();
        
        // Skip if it's a common word or contains domain extensions
        if (!/\.(com|org|net|edu|gov)/i.test(candidateName) && 
            !excludeWords.includes(nameLower) && 
            candidateName.length > 1) {
          // Proper case the name
          extracted.contactName = candidateName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          break;
        }
      }
    }

    return extracted;
  };

  const isValidData = (data: DealFormData): boolean => {
    return !!(
      data.companyWebsite &&
      data.contactName &&
      data.contactEmail &&
      /^[\w.-]+@[\w.-]+\.\w+$/.test(data.contactEmail)
    );
  };

  // Analyze company website using existing company-info API
  const analyzeWebsite = async (website: string): Promise<string> => {
    try {
      // Extract company name from website URL for the API using the utility function
      const companyName = cleanCompanyName(website) || 'unknown';
      
      const response = await fetch(`/api/company-info?company=${encodeURIComponent(companyName)}`);

      if (response.ok) {
        const data = await response.json();
        return data.summary || 'Unable to analyze website';
      }
    } catch (error) {
      console.error('Error analyzing website:', error);
    }
    return 'Unable to analyze website';
  };

  // Check for previous emails and meetings
  const checkPreviousInteractions = async (email: string): Promise<{ emails: any[], meetings: any[] }> => {
    try {
      const [emailsResponse, meetingsResponse] = await Promise.all([
        fetch(`/api/emails/search?email=${encodeURIComponent(email)}&accountId=${params.account}`),
        fetch(`/api/meetings/search?email=${encodeURIComponent(email)}&accountId=${params.account}`)
      ]);

      const emails = emailsResponse.ok ? await emailsResponse.json() : { data: [] };
      const meetings = meetingsResponse.ok ? await meetingsResponse.json() : { data: [] };

      return { emails: emails.data || [], meetings: meetings.data || [] };
    } catch (error) {
      console.error('Error checking previous interactions:', error);
      return { emails: [], meetings: [] };
    }
  };

  // Present all information to user
  const presentDealSummary = (data: DealFormData): string => {
    let summary = "Here is everything I know about this deal:\n\n";
    
    summary += `🌐 **Company Website:** ${data.companyWebsite}\n`;
    
    if (data.companyName) {
      summary += `🏢 **Company Name:** ${data.companyName}\n`;
    }
    
    if (data.companyDescription) {
      summary += `📋 **Company Description:** ${data.companyDescription}\n`;
    }
    
    if (data.industry) {
      summary += `🏭 **Industry:** ${data.industry}\n`;
    }
    
    summary += `👤 **Primary Contact:** ${data.contactName}\n`;
    summary += `📧 **Contact Email:** ${data.contactEmail}\n`;
    
    if (data.previousEmails && data.previousEmails.length > 0) {
      summary += `📬 **Previous Emails:** ${data.previousEmails.length} found\n`;
      // Show the most recent email subject
      const recentEmail = data.previousEmails[0];
      if (recentEmail?.subject) {
        summary += `   Latest: "${recentEmail.subject}"\n`;
      }
    }
    
    if (data.previousMeetings && data.previousMeetings.length > 0) {
      summary += `🤝 **Previous Meetings:** ${data.previousMeetings.length} found\n`;
      // Show the most recent meeting
      const recentMeeting = data.previousMeetings[0];
      if (recentMeeting?.title) {
        summary += `   Latest: "${recentMeeting.title}"\n`;
      }
    }
    
    summary += "\nAnything I missed?";
    
    return summary;
  };

  // Ask follow-up questions using AI
  const askFollowUpQuestion = async (userInput: string) => {
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `The user said: "${userInput}". Based on this, ask them a relevant follow-up question to gather more information about their deal. Keep it brief and specific.`,
          accountId: params.account as string,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const followUpMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.response || 'What additional information would you like to add?',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, followUpMessage]);
      }
    } catch (error) {
      console.error('Error asking follow-up question:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'What additional information would you like to add?',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
    setIsProcessing(false);
  };

  // Create the deal with all the enhanced data
  const createDeal = async () => {
    try {
      const finalDeal = {
        companyName: cleanCompanyName(dealData.companyName || dealData.companyWebsite),
        industry: dealData.industry || 'Technology', // Default fallback
        dealValue: 0, // Will be updated later
        currency: 'USD',
        email: dealData.contactEmail!,
        contactName: dealData.contactName!,
        stage: 'interested',
        description: dealData.companyDescription,
        website: dealData.companyWebsite,
        // Add primary contact, not as decision maker
        contact: {
          name: dealData.contactName!,
          email: dealData.contactEmail!,
          isPrimary: true,
          isDecisionMaker: false,
        },
        // Include previous interaction data for analysis
        previousEmails: dealData.previousEmails || [],
        previousMeetings: dealData.previousMeetings || [],
      };

      const successMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Perfect! Creating your deal for ${finalDeal.companyName} with ${finalDeal.contactName} as the primary contact...`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, successMessage]);

      // Create the deal via parent component
      setTimeout(async () => {
        try {
          await onDealCreated(finalDeal);
          setTimeout(() => onClose(), 1500);
        } catch (error) {
          console.error('Error creating deal:', error);
          const errorMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: 'Sorry, there was an error creating the deal. Please try again.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }, 1000);
    } catch (error) {
      console.error('Error in createDeal:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsProcessing(true);

    try {
      // Handle confirmation stage
      if (awaitingConfirmation) {
        const isNo = /^(no|nope|nothing|all good|looks good|create|proceed|that's it|done)$/i.test(currentInput.trim());
        
        if (isNo) {
          // Create the deal
          await createDeal();
          return;
        } else {
          // Ask follow-up questions using AI
          setAwaitingConfirmation(false);
          await askFollowUpQuestion(currentInput);
          return;
        }
      }

      // Extract information from user input - check for all info at once first
      const updatedDealData = { ...dealData };
      
      // First, try to extract all possible information from the message
      const allExtractedInfo = extractAllInfoFromMessage(currentInput);
      const numInfoPieces = Object.keys(allExtractedInfo).length;
      
      console.log('🔍 Analyzing input:', currentInput);
      console.log('🎯 Extracted info:', allExtractedInfo);
      console.log('📊 Number of pieces:', numInfoPieces);
      
      if (numInfoPieces > 1) {
        // User provided multiple pieces of information at once
        console.log('✅ Multiple info pieces detected, processing all at once');
        Object.assign(updatedDealData, allExtractedInfo);
      } else {
        // Check if the single piece of extracted info is for a different field
        if (numInfoPieces === 1) {
          console.log('📝 Single piece extracted, merging with current data');
          Object.assign(updatedDealData, allExtractedInfo);
        } else {
          // Standard single-question extraction as fallback
          const extractedInfo = extractInfoFromMessage(currentInput, currentQuestion);
          if (extractedInfo && currentQuestion) {
            (updatedDealData as any)[currentQuestion] = extractedInfo;
          }
        }
      }

      setDealData(updatedDealData);

      // If we just got the website, analyze it
      if ((currentQuestion === 'companyWebsite' || numInfoPieces > 1) && updatedDealData.companyWebsite && !updatedDealData.companyDescription) {
        let analysisContent = '';
        if (numInfoPieces > 1) {
          analysisContent = `Perfect! I extracted all the information:\n${updatedDealData.companyWebsite ? `🌐 Website: ${updatedDealData.companyWebsite}` : ''}${updatedDealData.contactName ? `\n👤 Contact: ${updatedDealData.contactName}` : ''}${updatedDealData.contactEmail ? `\n📧 Email: ${updatedDealData.contactEmail}` : ''}\n\nLet me analyze ${updatedDealData.companyWebsite}...`;
        } else {
          analysisContent = `Got it! Let me analyze ${updatedDealData.companyWebsite}...`;
        }
        
        const analysisMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: analysisContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, analysisMessage]);

        const analysis = await analyzeWebsite(updatedDealData.companyWebsite);
        updatedDealData.companyDescription = analysis;
        
        // Try to extract company name from analysis
        const lines = analysis.split('.');
        if (lines.length > 0 && lines[0]) {
          const firstLine = lines[0];
          const companyNameMatch = firstLine.match(/^([A-Z][a-zA-Z\s&]+?)(?:\s+is|\s+provides|\s+offers|\s+specializes)/);
          if (companyNameMatch && companyNameMatch[1]) {
            updatedDealData.companyName = companyNameMatch[1].trim();
          }
        }

        setDealData(updatedDealData);
      }

      // Check if we have enough info to proceed
      console.log('🔍 Checking if we have enough data:', updatedDealData);
      console.log('✅ isValidData result:', isValidData(updatedDealData));
      
      if (isValidData(updatedDealData)) {
        // Check for previous interactions
        const loadingMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: `Checking for previous emails and meetings with ${updatedDealData.contactEmail}...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, loadingMessage]);

        const interactions = await checkPreviousInteractions(updatedDealData.contactEmail!);
        updatedDealData.previousEmails = interactions.emails;
        updatedDealData.previousMeetings = interactions.meetings;
        setDealData(updatedDealData);

        // Present summary
        const summaryMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: presentDealSummary(updatedDealData),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, summaryMessage]);
        setAwaitingConfirmation(true);
      } else {
        // Ask next question
        const nextQ = getNextQuestion(updatedDealData);
        if (nextQ) {
          setCurrentQuestion(nextQ.field);
          const nextMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: nextQ.question,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, nextMessage]);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput('');
    setDealData({});
    setCurrentQuestion('');
    setMessageIdCounter(0);
    setAwaitingConfirmation(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="!fixed !inset-0 !m-0 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 !transform-none overflow-hidden !rounded-none border-none bg-black/95 p-0"
        style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          transform: 'none',
          margin: '0px',
          padding: '0px',
        }}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5">
          <DialogTitle className="font-monument text-lg text-white sm:text-xl md:text-2xl">
            Create New Deal
          </DialogTitle>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-60px)] flex-col sm:h-[calc(100vh-68px)] md:h-[calc(100vh-80px)]">
          {/* Chat Messages - Scrollable Area */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-3 p-4 sm:space-y-4 sm:p-6 md:p-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3 sm:gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="bg-designer-violet/20 h-8 w-8 shrink-0 sm:h-10 sm:w-10">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg p-3 text-sm sm:max-w-[70%] sm:text-base md:p-4',
                      message.role === 'assistant'
                        ? 'glassmorphism text-white'
                        : 'bg-designer-violet/20 border-designer-violet/30 border text-white',
                    )}
                  >
                    <div className="leading-relaxed break-words whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="bg-designer-blue/20 h-8 w-8 shrink-0 sm:h-10 sm:w-10">
                      <AvatarFallback>
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-white/10 bg-black/50 backdrop-blur-sm">
            {/* Deal Data Summary */}
            {Object.keys(dealData).length > 0 && (
              <div className="mx-4 mt-3 mb-3 rounded-lg bg-white/5 p-3 sm:mx-6 sm:p-4 md:mx-8">
                <p className="mb-2 text-sm text-white/60">
                  Collected Information:
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {dealData.companyName && (
                    <span className="bg-designer-violet/20 text-designer-violet rounded px-2 py-1">
                      Company: {dealData.companyName}
                    </span>
                  )}
                  {dealData.industry && (
                    <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-400">
                      Industry: {dealData.industry}
                    </span>
                  )}
                  {dealData.valueAmount && (
                    <span className="rounded bg-green-500/20 px-2 py-1 text-green-400">
                      Value: USD {dealData.valueAmount}
                    </span>
                  )}
                  {dealData.contactName && (
                    <span className="rounded bg-yellow-500/20 px-2 py-1 text-yellow-400">
                      Contact: {dealData.contactName}
                    </span>
                  )}
                  {dealData.contactEmail && (
                    <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-400">
                      Email: {dealData.contactEmail}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Input Field */}
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  disabled={isProcessing}
                  className="focus-visible:ring-designer-violet/50 flex-1 border-white/10 bg-black/40 text-sm sm:text-base"
                  style={{
                    minHeight: '44px',
                    maxHeight: '44px',
                    height: '44px',
                    resize: 'none',
                    overflow: 'hidden',
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isProcessing}
                  className="bg-designer-violet hover:bg-designer-violet/90 px-4 sm:px-6"
                  style={{
                    minHeight: '44px',
                    height: '44px',
                  }}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                  ) : (
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

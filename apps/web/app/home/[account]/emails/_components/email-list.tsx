'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { formatDistanceToNow } from 'date-fns';
import {
  Archive,
  Building2,
  Forward,
  Mail,
  RefreshCw,
  Reply,
  Star,
  User,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

interface DealContext {
  contact: {
    id: string;
    name: string;
    email: string;
    role: string;
    is_decision_maker: boolean;
  };
  deal: {
    id: string;
    company_name: string;
    stage: string;
    value: string;
  };
}

interface DealEmail {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string;
  to_email: string[] | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  dealContext?: DealContext[];
}

interface EmailListProps {
  emails: DealEmail[];
}

export default function EmailList({ emails: initialEmails }: EmailListProps) {
  const [emails, setEmails] = useState<DealEmail[]>(initialEmails);
  const [selectedEmail, setSelectedEmail] = useState<DealEmail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const router = useRouter();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshEmails();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshEmails = async () => {
    try {
      setIsRefreshing(true);
      router.refresh(); // This refreshes the server component data
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh emails:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update emails when prop changes (after refresh)
  useEffect(() => {
    setEmails(initialEmails);
  }, [initialEmails]);

  const formatCurrency = (value: string) => {
    if (!value || value === 'null' || value === 'undefined') return '$0';

    let cleanValue = value.toString().trim();

    if (cleanValue.startsWith('$') && !cleanValue.includes('NaN')) {
      return cleanValue;
    }

    const numberMatch = cleanValue.match(/[\d,]+/);
    if (!numberMatch) return '$0';

    const numValue = parseInt(numberMatch[0].replace(/,/g, ''));
    if (isNaN(numValue)) return '$0';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  // const getStageColor = (stage: string) => {
  //   switch (stage) {
  //     case 'interested':
  //       return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  //     case 'qualified':
  //       return 'bg-green-500/20 text-green-400 border-green-500/30';
  //     case 'demo':
  //       return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  //     case 'proposal':
  //       return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  //     case 'closed-won':
  //       return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  //     case 'closed-lost':
  //       return 'bg-red-500/20 text-red-400 border-red-500/30';
  //     default:
  //       return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  //   }
  // };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'interested':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'contacted':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'demo':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'proposal':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'negotiation':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'won':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'lost':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleEmailClick = (email: DealEmail) => {
    setSelectedEmail(email);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedEmail(null);
  };

  if (emails.length === 0) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>No deal-related emails found.</p>
        <p className="text-sm">
          Emails will appear here once you have contacts linked to deals.
        </p>

        {/* Refresh Status */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <RefreshCw
            className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>
            {isRefreshing
              ? 'Refreshing...'
              : `Last updated: ${formatDistanceToNow(lastRefresh, { addSuffix: true })}`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Refresh Status Bar */}
      <div className="text-muted-foreground mb-4 flex items-center justify-between text-xs">
        <span>{emails.length} deal-related emails</span>
        <div className="flex items-center gap-2">
          <RefreshCw
            className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>
            {isRefreshing
              ? 'Refreshing...'
              : `Last updated: ${formatDistanceToNow(lastRefresh, { addSuffix: true })}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshEmails}
            disabled={isRefreshing}
            className="h-6 px-2"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {emails.map((email) => (
          <Card
            key={email.id}
            className="hover:bg-muted/50 border-border bg-card cursor-pointer transition-colors"
            onClick={() => handleEmailClick(email)}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle
                      className={`text-base ${!email.is_read ? 'font-bold' : ''}`}
                    >
                      {email.subject || '(No Subject)'}
                    </CardTitle>
                    {email.is_starred && (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-1 text-sm">
                    <Mail className="h-3 w-3" />
                    From:{' '}
                    {email.from_name
                      ? `${email.from_name} <${email.from_email}>`
                      : email.from_email}
                  </CardDescription>

                  {/* Deal Context */}
                  {email.dealContext && email.dealContext.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {email.dealContext.map((context, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStageColor(context.deal.stage)}`}
                          >
                            <Building2 className="mr-1 h-3 w-3" />
                            {context.deal.company_name}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <User className="mr-1 h-3 w-3" />
                            {context.contact.name}
                            {context.contact.is_decision_maker && (
                              <span className="text-designer-violet ml-1">
                                ★
                              </span>
                            )}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatCurrency(context.deal.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(email.received_at), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {email.body_text || 'No text content'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Email Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {selectedEmail.subject || '(No Subject)'}
                  {selectedEmail.is_starred && (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Email Header */}
                <div className="border-b pb-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {selectedEmail.from_name
                          ? `${selectedEmail.from_name} <${selectedEmail.from_email}>`
                          : selectedEmail.from_email}
                      </p>

                      <p className="text-muted-foreground text-sm">
                        To:{' '}
                        {Array.isArray(selectedEmail.to_email)
                          ? selectedEmail.to_email.join(', ')
                          : selectedEmail.to_email || 'Multiple recipients'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-sm">
                        {new Date(selectedEmail.received_at).toLocaleDateString(
                          'en-US',
                          {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Deal Context in Detail */}
                  {selectedEmail.dealContext &&
                    selectedEmail.dealContext.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedEmail.dealContext.map((context, idx) => (
                          <div
                            key={idx}
                            className="bg-muted flex items-center gap-2 rounded-lg p-2"
                          >
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStageColor(context.deal.stage)}`}
                            >
                              <Building2 className="mr-1 h-3 w-3" />
                              {context.deal.company_name}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <User className="mr-1 h-3 w-3" />
                              {context.contact.name} - {context.contact.role}
                              {context.contact.is_decision_maker && (
                                <span className="text-designer-violet ml-1">
                                  ★
                                </span>
                              )}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {formatCurrency(context.deal.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Email Body */}
                <div className="prose max-w-none">
                  {selectedEmail.body_html ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedEmail.body_html,
                      }}
                      className="email-content"
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">
                      {selectedEmail.body_text || 'No content available'}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 border-t pt-4">
                  <Button variant="outline" size="sm">
                    <Reply className="mr-2 h-4 w-4" />
                    Reply
                  </Button>
                  <Button variant="outline" size="sm">
                    <Forward className="mr-2 h-4 w-4" />
                    Forward
                  </Button>
                  <Button variant="outline" size="sm">
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                  <Button variant="outline" size="sm">
                    <Star className="mr-2 h-4 w-4" />
                    {selectedEmail.is_starred ? 'Unstar' : 'Star'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

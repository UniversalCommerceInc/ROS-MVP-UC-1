'use client';

import { useState } from 'react';

import { Edit3, Loader2, Mail, Send, X } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { toast } from '@kit/ui/sonner';
import { Textarea } from '@kit/ui/textarea';

interface EmailComponents {
  subject: string;
  body: string;
  to: string;
  cc?: string;
  bcc?: string;
}

interface InlineEmailEditorProps {
  emailComponents: EmailComponents;
  dealId: string;
  accountId: string;
  companyName: string;
  emailProvider: 'gmail' | 'outlook';
  onSent?: () => void;
  onCancel?: () => void;
  onEmailSyncNeeded?: () => void;
}

export default function InlineEmailEditor({
  emailComponents,
  dealId,
  accountId,
  companyName,
  emailProvider,
  onSent,
  onCancel,
  onEmailSyncNeeded,
}: InlineEmailEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editedEmail, setEditedEmail] = useState(emailComponents);

  const getProviderInfo = () => {
    switch (emailProvider) {
      case 'gmail':
        return {
          name: 'Gmail',
          color: 'bg-blue-500/20 text-blue-400',
          endpoint: '/api/gmail/send',
        };
      case 'outlook':
        return {
          name: 'Outlook',
          color: 'bg-purple-500/20 text-purple-400',
          endpoint: '/api/microsoft/send',
        };
      default:
        return {
          name: 'Email',
          color: 'bg-gray-500/20 text-gray-400',
          endpoint: '/api/gmail/send',
        };
    }
  };

  const providerInfo = getProviderInfo();

  const handleSendEmail = async () => {
    if (!editedEmail.to || !editedEmail.subject || !editedEmail.body) {
      toast.warning('Missing Information', {
        description: 'Please fill in all required fields (To, Subject, Body)',
      });
      return;
    }

    setIsSending(true);
    try {
      console.log(`📧 Sending email via ${providerInfo.name}...`);

      const response = await fetch(providerInfo.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: editedEmail.to,
          cc: editedEmail.cc,
          bcc: editedEmail.bcc,
          subject: editedEmail.subject,
          body: editedEmail.body,
          accountId: accountId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Email sent successfully via ${providerInfo.name}`);

        // Log the sent email as an activity
        try {
          await fetch('/api/activities', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              deal_id: dealId,
              type: 'email',
              title: `Email Sent via ${providerInfo.name}: ${editedEmail.subject}`,
              description: `Sent email to ${editedEmail.to} via ${providerInfo.name} - ${editedEmail.subject}. ${editedEmail.body.substring(0, 200)}...`,
              metadata: {
                provider: emailProvider,
                to: editedEmail.to,
                cc: editedEmail.cc,
                bcc: editedEmail.bcc,
                subject: editedEmail.subject,
              },
            }),
          });
        } catch (activityError) {
          console.warn('⚠️ Could not log email activity:', activityError);
        }

        // Provider-specific sync logic
        if (emailProvider === 'gmail') {
          // Trigger Gmail sync after sending to capture the sent email
          console.log('📧 Email sent via Gmail, triggering sync...');
          try {
            const syncResponse = await fetch('/api/gmail/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accountId: accountId,
                email: editedEmail.to,
              }),
            });

            if (syncResponse.ok) {
              console.log(
                '✅ Gmail sync triggered successfully after email send',
              );

              // Trigger email summary refresh after a short delay
              setTimeout(async () => {
                try {
                  console.log(
                    '🔄 Refreshing email summary after email send...',
                  );
                  await fetch(
                    `/api/deals/${dealId}/email-summary?accountId=${accountId}&refresh=true`,
                  );
                  console.log('✅ Email summary refresh triggered');
                } catch (summaryError) {
                  console.error(
                    '❌ Error refreshing email summary:',
                    summaryError,
                  );
                }
              }, 3000); // 3 second delay to allow sync to process
            }
          } catch (syncError) {
            console.error(
              '❌ Error triggering Gmail sync after send:',
              syncError,
            );
          }
        } else if (emailProvider === 'outlook') {
          // For Outlook, we might need different sync logic or no sync
          console.log('📧 Email sent via Microsoft Outlook - no sync needed');

          // Optionally trigger email summary refresh for Outlook as well
          setTimeout(async () => {
            try {
              console.log(
                '🔄 Refreshing email summary after Outlook email send...',
              );
              await fetch(
                `/api/deals/${dealId}/email-summary?accountId=${accountId}&refresh=true`,
              );
              console.log('✅ Email summary refresh triggered');
            } catch (summaryError) {
              console.error('❌ Error refreshing email summary:', summaryError);
            }
          }, 2000); // Shorter delay for Outlook since no sync needed
        }

        toast.success('Email Sent Successfully', {
          description: `Your email to ${editedEmail.to} has been sent via ${providerInfo.name}.`,
        });

        // Notify parent component about email sync need
        if (onEmailSyncNeeded) {
          onEmailSyncNeeded();
        }

        if (onSent) {
          onSent();
        }
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to send email via ${providerInfo.name}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error sending email via ${providerInfo.name}:`, error);
      toast.error('Error Sending Email', {
        description:
          error instanceof Error
            ? `${providerInfo.name}: ${error.message}`
            : `An unexpected error occurred with ${providerInfo.name}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedEmail(emailComponents); // Reset to original
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Card className="border-designer-violet/30 mt-3 bg-gray-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-designer-violet flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Email Draft for {companyName}
          </span>
          <div className="flex items-center gap-2">
            <Badge className={providerInfo.color}>
              <Mail className="mr-1 h-3 w-3" />
              {providerInfo.name}
            </Badge>
            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="text-designer-violet hover:text-designer-violet/80"
              >
                <Edit3 className="mr-1 h-3 w-3" />
                Edit
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="text-green-400 hover:text-green-300"
              >
                Save
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-300"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* To Field */}
        <div className="space-y-1">
          <Label htmlFor="to" className="text-xs text-gray-300">
            To *
          </Label>
          {isEditing ? (
            <Input
              id="to"
              type="email"
              value={editedEmail.to}
              onChange={(e) =>
                setEditedEmail((prev) => ({ ...prev, to: e.target.value }))
              }
              className="border-gray-600 bg-gray-700 text-sm text-white"
              placeholder="recipient@example.com"
            />
          ) : (
            <div className="rounded border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-white">
              {editedEmail.to}
            </div>
          )}
        </div>

        {/* CC Field (Optional) */}
        {(isEditing || editedEmail.cc) && (
          <div className="space-y-1">
            <Label htmlFor="cc" className="text-xs text-gray-300">
              CC
            </Label>
            {isEditing ? (
              <Input
                id="cc"
                type="email"
                value={editedEmail.cc || ''}
                onChange={(e) =>
                  setEditedEmail((prev) => ({ ...prev, cc: e.target.value }))
                }
                className="border-gray-600 bg-gray-700 text-sm text-white"
                placeholder="cc@example.com"
              />
            ) : (
              <div className="rounded border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-white">
                {editedEmail.cc}
              </div>
            )}
          </div>
        )}

        {/* Subject Field */}
        <div className="space-y-1">
          <Label htmlFor="subject" className="text-xs text-gray-300">
            Subject *
          </Label>
          {isEditing ? (
            <Input
              id="subject"
              value={editedEmail.subject}
              onChange={(e) =>
                setEditedEmail((prev) => ({ ...prev, subject: e.target.value }))
              }
              className="border-gray-600 bg-gray-700 text-sm text-white"
              placeholder="Email subject"
            />
          ) : (
            <div className="rounded border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-white">
              {editedEmail.subject}
            </div>
          )}
        </div>

        {/* Body Field */}
        <div className="space-y-1">
          <Label htmlFor="body" className="text-xs text-gray-300">
            Body *
          </Label>
          {isEditing ? (
            <Textarea
              id="body"
              value={editedEmail.body}
              onChange={(e) =>
                setEditedEmail((prev) => ({ ...prev, body: e.target.value }))
              }
              className="min-h-[150px] border-gray-600 bg-gray-700 text-sm text-white"
              placeholder="Email body content"
            />
          ) : (
            <div className="min-h-[150px] rounded border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm whitespace-pre-wrap text-white">
              {editedEmail.body}
            </div>
          )}
        </div>

        {/* Send Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSendEmail}
            disabled={
              isSending ||
              !editedEmail.to ||
              !editedEmail.subject ||
              !editedEmail.body
            }
            className="bg-designer-violet hover:bg-designer-violet/90 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending via {providerInfo.name}...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send via {providerInfo.name}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

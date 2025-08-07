'use client';

import { useState } from 'react';

import { Loader2, Send, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { toast } from '@kit/ui/sonner';
import { Textarea } from '@kit/ui/textarea';

import { sendEmail } from '../_lib/actions/gmail';

interface GmailComposeProps {
  accountId: string;
  onEmailSent?: () => void;
  onClose?: () => void;
  initialTo?: string;
  initialSubject?: string;
}

export function GmailCompose({
  accountId,
  onEmailSent,
  onClose,
  initialTo = '',
  initialSubject = '',
}: GmailComposeProps) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to || !body) {
      toast.error('Missing Fields', {
        description: 'Please provide recipient and message body',
      });
      return;
    }

    setIsSending(true);

    try {
      const response = await sendEmail(accountId, to, subject, body, cc, bcc);

      if (response.success) {
        toast.success('Email Sent', {
          description: 'Your email has been sent successfully',
        });

        // Reset form
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setBody('');

        // Notify parent component
        if (onEmailSent) {
          onEmailSent();
        }
      } else {
        toast.error('Error', {
          description: response.error || 'Failed to send email',
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Error', {
        description: 'Failed to send email',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compose Email</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            placeholder="recipient@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc">Cc</Label>
          <Input
            id="cc"
            placeholder="cc@example.com"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bcc">Bcc</Label>
          <Input
            id="bcc"
            placeholder="bcc@example.com"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            placeholder="Write your message here..."
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="resize-y"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={isSending || !to || !body}
          className="flex items-center gap-2"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Email
        </Button>
      </CardFooter>
    </Card>
  );
}

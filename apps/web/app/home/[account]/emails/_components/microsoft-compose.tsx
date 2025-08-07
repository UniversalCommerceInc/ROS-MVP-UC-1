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

interface MicrosoftComposeProps {
  accountId: string;
  onEmailSent?: () => void;
  onClose?: () => void;
  initialTo?: string;
  initialSubject?: string;
}

export function MicrosoftCompose({
  accountId,
  onEmailSent,
  onClose,
  initialTo = '',
  initialSubject = '',
}: MicrosoftComposeProps) {
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
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/microsoft/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          to,
          subject,
          body,
          cc: cc || undefined,
          bcc: bcc || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Email Sent', {
          description: 'Your email has been sent successfully via Microsoft',
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
          description: data.error || 'Failed to send email via Microsoft',
        });
      }
    } catch (error) {
      console.error('Error sending email via Microsoft:', error);
      toast.error('Error', {
        description: 'Failed to send email via Microsoft',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span>Compose Email</span>
          <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
            Microsoft
          </span>
        </CardTitle>
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
          Send via Microsoft
        </Button>
      </CardFooter>
    </Card>
  );
}

'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from '@kit/ui/sonner';
import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { LoadingOverlay } from '@kit/ui/loading-overlay';
import { Trans } from '@kit/ui/trans';

interface ContextSettingsContainerProps {
  userId: string;
}

export function ContextSettingsContainer({ 
  userId
}: ContextSettingsContainerProps) {
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [currentContext, setCurrentContext] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Fetch current context on component mount
  useEffect(() => {
    const fetchCurrentContext = async () => {
      try {
        const response = await fetch('/api/user/context');
        if (response.ok) {
          const data = await response.json();
          const userContext = data.context || '';
          setCurrentContext(userContext);
          setSelectedContext(userContext);
        }
      } catch (error) {
        console.error('Error fetching context:', error);
        setCurrentContext('');
        setSelectedContext('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentContext();
  }, []);

  const handleSaveContext = async () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/user/context', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: selectedContext,
          }),
        });

        if (response.ok) {
          setCurrentContext(selectedContext);
          toast.success('Context updated successfully');
        } else {
          const error = await response.json();
          toast.error(error.message || 'Failed to update context');
        }
      } catch (error) {
        console.error('Error updating context:', error);
        toast.error('Failed to update context');
      }
    });
  };

  const isChanged = selectedContext !== currentContext;

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="space-y-4">
      {isPending && <LoadingOverlay />}
      
      <div className="space-y-2">
        <Label htmlFor="context">
          <Trans i18nKey="account:context" defaults="Company Context" />
        </Label>
        <Textarea
          id="context"
          value={selectedContext}
          onChange={(e) => setSelectedContext(e.target.value)}
          disabled={isPending}
          placeholder="Describe your company and what you're selling..."
          className="min-h-[120px]"
        />
        <p className="text-sm text-muted-foreground">
          <Trans 
            i18nKey="account:contextDescription" 
            defaults="Provide context about your company and what you're selling. This will help personalize your experience." 
          />
        </p>
      </div>

      {isChanged && (
        <Button 
          onClick={handleSaveContext}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <Trans i18nKey="common:save" defaults="Save" />
        </Button>
      )}
    </div>
  );
}

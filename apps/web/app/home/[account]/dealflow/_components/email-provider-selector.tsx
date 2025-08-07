import React, { useEffect, useState } from 'react';

import { AlertCircle, CheckCircle, Loader2, Mail } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import {
  GmailLogo,
  OutlookLogo,
} from '../../emails/_components/email-integrations';

interface EmailProviderSelectorProps {
  accountId: string;
  onProviderSelected: (provider: 'gmail' | 'outlook') => void;
  onCancel?: () => void;
}

interface ProviderStatus {
  gmail: {
    connected: boolean;
    email?: string;
    lastSync?: string;
    error?: string;
  };
  outlook: {
    // Changed from 'microsoft' to 'outlook' for consistency
    connected: boolean;
    email?: string;
    lastSync?: string;
    error?: string;
  };
}

export function EmailProviderSelector({
  accountId,
  onProviderSelected,
  onCancel,
}: EmailProviderSelectorProps) {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    gmail: { connected: false },
    outlook: { connected: false }, // Changed from 'microsoft' to 'outlook'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkProviderStatus();
  }, [accountId]);

  const checkProviderStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use your existing consolidated provider status API
      const response = await fetch(
        `/api/provider-status?accountId=${accountId}`, // Fixed: use provider-status not calendar/provider-status
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to check provider status');
      }

      setProviderStatus({
        gmail: {
          connected: data.google || false,
          email: data.details?.google?.email,
          lastSync: data.details?.google?.lastSync,
          error: data.details?.google?.error,
        },
        outlook: {
          // Map Microsoft data to outlook key
          connected: data.microsoft || false,
          email: data.details?.microsoft?.email,
          lastSync: data.details?.microsoft?.lastSync,
          error: data.details?.microsoft?.error,
        },
      });
    } catch (err) {
      console.error('Error checking provider status:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to check email provider status',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (provider: 'gmail' | 'outlook') => {
    const status = providerStatus[provider];

    if (!status.connected) {
      // Redirect to connection page
      window.open(
        `/dashboard/settings/integrations?provider=${provider}`,
        '_blank',
      );
      return;
    }

    onProviderSelected(provider);
  };

  if (loading) {
    return (
      <Card className="border-designer-violet/30 bg-gray-800/50">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-400">
              Checking email providers...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkProviderStatus}
            className="mt-3"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasConnectedProvider =
    providerStatus.gmail.connected || providerStatus.outlook.connected;

  const connectedProvidersCount =
    (providerStatus.gmail.connected ? 1 : 0) +
    (providerStatus.outlook.connected ? 1 : 0);

  return (
    <Card className="border-designer-violet/30 bg-gray-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-designer-violet flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4" />
          Choose Email Provider
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="mb-4 text-sm text-gray-400">
          Select which email provider to use for sending your draft email:
        </p>

        {/* Show side-by-side buttons if both providers are connected */}
        {connectedProvidersCount === 2 ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Gmail Quick Button */}
            <Button
              onClick={() => handleProviderSelect('gmail')}
              className="flex h-auto flex-col items-center gap-2 border border-blue-500/30 bg-blue-500/20 py-4 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300"
              variant="outline"
            >
              <GmailLogo className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Gmail</div>
                <div className="text-xs opacity-75">
                  {providerStatus.gmail.email}
                </div>
              </div>
            </Button>

            {/* Outlook Quick Button */}
            <Button
              onClick={() => handleProviderSelect('outlook')}
              className="flex h-auto flex-col items-center gap-2 border border-purple-500/30 bg-purple-500/20 py-4 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300"
              variant="outline"
            >
              <OutlookLogo className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Outlook</div>
                <div className="text-xs opacity-75">
                  {providerStatus.outlook.email}
                </div>
              </div>
            </Button>
          </div>
        ) : (
          /* Show detailed cards if only one or no providers connected */
          <div className="space-y-3">
            {/* Gmail Provider Card */}
            <div className="rounded-lg border border-gray-600 bg-gray-700/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/20">
                    <GmailLogo className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Gmail</h3>
                    {providerStatus.gmail.email && (
                      <p className="text-xs text-gray-400">
                        {providerStatus.gmail.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {providerStatus.gmail.connected ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </div>

              {providerStatus.gmail.lastSync && (
                <p className="mb-2 text-xs text-gray-500">
                  Last sync:{' '}
                  {new Date(providerStatus.gmail.lastSync).toLocaleString()}
                </p>
              )}

              <Button
                variant={providerStatus.gmail.connected ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleProviderSelect('gmail')}
                className={
                  providerStatus.gmail.connected
                    ? 'w-full bg-blue-500 text-white hover:bg-blue-600'
                    : 'w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
                }
              >
                {providerStatus.gmail.connected
                  ? 'Use Gmail'
                  : 'Connect Gmail First'}
              </Button>
            </div>

            {/* Outlook Provider Card */}
            <div className="rounded-lg border border-gray-600 bg-gray-700/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-500/20">
                    <OutlookLogo className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Outlook</h3>
                    {providerStatus.outlook.email && (
                      <p className="text-xs text-gray-400">
                        {providerStatus.outlook.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {providerStatus.outlook.connected ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </div>

              {providerStatus.outlook.lastSync && (
                <p className="mb-2 text-xs text-gray-500">
                  Last sync:{' '}
                  {new Date(providerStatus.outlook.lastSync).toLocaleString()}
                </p>
              )}

              <Button
                variant={
                  providerStatus.outlook.connected ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleProviderSelect('outlook')}
                className={
                  providerStatus.outlook.connected
                    ? 'w-full bg-purple-500 text-white hover:bg-purple-600'
                    : 'w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/20'
                }
              >
                {providerStatus.outlook.connected
                  ? 'Use Outlook'
                  : 'Connect Outlook First'}
              </Button>
            </div>
          </div>
        )}

        {!hasConnectedProvider && (
          <div className="rounded border border-orange-500/30 bg-orange-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-orange-400" />
              <div className="text-sm text-orange-300">
                <p className="mb-1 font-medium">No Email Providers Connected</p>
                <p>
                  You need to connect at least one email provider to send
                  emails. Go to Settings → Integrations to connect Gmail or
                  Outlook.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <div className="flex justify-end border-t border-gray-600 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';

import { FolkConnectModal } from './folk-connect-modal';

interface IntegrationConnectButtonProps {
  platform: string;
  accountId: string;
  isConnected: boolean;
  accountName: string;
}

export function IntegrationConnectButton({
  platform,
  accountId,
  isConnected,
  accountName,
}: IntegrationConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showFolkModal, setShowFolkModal] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    // Special handling for Folk CRM
    if (platform === 'folk') {
      setShowFolkModal(true);
      return;
    }

    // Special handling for Slack - direct redirect to install
    if (platform === 'slack') {
      setIsConnecting(true);
      try {
        window.location.href = `/api/slack/install?accountId=${accountId}`;
      } catch (error) {
        console.error('Error connecting to Slack:', error);
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    // Standard OAuth flow for other platforms
    setIsConnecting(true);
    try {
      window.location.href = `/api/auth/${platform}?platform=${platform}&accountId=${accountId}`;
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(`/api/integrations/${platform}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        console.error('Failed to disconnect');
      }
    } catch (error) {
      console.error(`Error disconnecting from ${platform}:`, error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

  if (isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
      >
        {isDisconnecting ? (
          <div className="flex items-center">
            <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            Disconnecting...
          </div>
        ) : (
          'Disconnect'
        )}
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        className="w-full"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <div className="flex items-center">
            <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            Connecting...
          </div>
        ) : (
          `Connect ${platformName}`
        )}
      </Button>

      {/* Folk Connect Modal */}
      {platform === 'folk' && (
        <FolkConnectModal
          isOpen={showFolkModal}
          onClose={() => setShowFolkModal(false)}
          accountId={accountId}
          accountName={accountName}
        />
      )}
    </>
  );
}

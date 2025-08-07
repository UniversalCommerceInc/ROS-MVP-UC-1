import React, { useEffect, useState } from 'react';

import { AlertCircle, CheckCircle, ChevronDown, Video } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Label } from '@kit/ui/label';
import { toast } from '@kit/ui/sonner';

interface MeetingProviderSelectorProps {
  selectedProvider: 'google' | 'microsoft';
  onProviderChange: (provider: 'google' | 'microsoft') => void;
  accountId: string;
  className?: string;
}

interface ProviderStatus {
  google: boolean;
  microsoft: boolean;
  loading: boolean;
}

// Google Meet Icon Component (Original Logo)
const GoogleMeetIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 32 32"
  >
    <path d="M24,21.45V25a2.0059,2.0059,0,0,1-2,2H9V21h9V16Z" fill="#00ac47" />
    <polygon fill="#31a950" points="24 11 24 21.45 18 16 18 11 24 11" />
    <polygon fill="#ea4435" points="9 5 9 11 3 11 9 5" />
    <rect fill="#4285f4" height="11" width="6" x="3" y="11" />
    <path
      d="M24,7v4h-.5L18,16V11H9V5H22A2.0059,2.0059,0,0,1,24,7Z"
      fill="#ffba00"
    />
    <path d="M9,21v6H5a2.0059,2.0059,0,0,1-2-2V21Z" fill="#0066da" />
    <path
      d="M29,8.26V23.74a.9989.9989,0,0,1-1.67.74L24,21.45,18,16l5.5-5,.5-.45,3.33-3.03A.9989.9989,0,0,1,29,8.26Z"
      fill="#00ac47"
    />
    <polygon fill="#188038" points="24 10.55 24 21.45 18 16 23.5 11 24 10.55" />
  </svg>
);

// Microsoft Teams Icon Component (Updated Clean Logo)
const TeamsIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      fill="#5059C9"
      d="M10.765 6.875h3.616c.342 0 .619.276.619.617v3.288a2.272 2.272 0 01-2.274 2.27h-.01a2.272 2.272 0 01-2.274-2.27V7.199c0-.179.145-.323.323-.323zM13.21 6.225c.808 0 1.464-.655 1.464-1.462 0-.808-.656-1.463-1.465-1.463s-1.465.655-1.465 1.463c0 .807.656 1.462 1.465 1.462z"
    />
    <path
      fill="#7B83EB"
      d="M8.651 6.225a2.114 2.114 0 002.117-2.112A2.114 2.114 0 008.65 2a2.114 2.114 0 00-2.116 2.112c0 1.167.947 2.113 2.116 2.113zM11.473 6.875h-5.97a.611.611 0 00-.596.625v3.75A3.669 3.669 0 008.488 15a3.669 3.669 0 003.582-3.75V7.5a.611.611 0 00-.597-.625z"
    />
    <path
      fill="#000000"
      d="M8.814 6.875v5.255a.598.598 0 01-.596.595H5.193a3.951 3.951 0 01-.287-1.476V7.5a.61.61 0 01.597-.624h3.31z"
      opacity=".1"
    />
    <path
      fill="#000000"
      d="M8.488 6.875v5.58a.6.6 0 01-.596.595H5.347a3.22 3.22 0 01-.267-.65 3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.488 6.875v4.93a.6.6 0 01-.596.595H5.08a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.163 6.875v4.93a.6.6 0 01-.596.595H5.079a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.66z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.814 5.195v1.024c-.055.003-.107.006-.163.006-.055 0-.107-.003-.163-.006A2.115 2.115 0 016.593 4.6h1.625a.598.598 0 01.596.594z"
      opacity=".1"
    />
    <path
      fill="#000000"
      d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.163 5.52v.647a2.115 2.115 0 01-1.465-1.242h.87a.598.598 0 01.595.595z"
      opacity=".2"
    />
    <path
      fill="url(#microsoft-teams-color-16__paint0_linear_2372_494)"
      d="M1.597 4.925h5.969c.33 0 .597.267.597.596v5.958a.596.596 0 01-.597.596h-5.97A.596.596 0 011 11.479V5.521c0-.33.267-.596.597-.596z"
    />
    <path
      fill="#ffffff"
      d="M6.152 7.193H4.959v3.243h-.76V7.193H3.01v-.63h3.141v.63z"
    />
    <defs>
      <linearGradient
        id="microsoft-teams-color-16__paint0_linear_2372_494"
        x1="2.244"
        x2="6.906"
        y1="4.46"
        y2="12.548"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#5A62C3" />
        <stop offset=".5" stopColor="#4D55BD" />
        <stop offset="1" stopColor="#3940AB" />
      </linearGradient>
    </defs>
  </svg>
);

export function MeetingProviderSelector({
  selectedProvider,
  onProviderChange,
  accountId,
  className = '',
}: MeetingProviderSelectorProps) {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    google: false,
    microsoft: false,
    loading: true,
  });

  useEffect(() => {
    checkProviderConnections();
  }, [accountId]);

  const checkProviderConnections = async () => {
    try {
      const response = await fetch(
        `/api/calendar/provider-status?accountId=${accountId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setProviderStatus({
          google: data.google || false,
          microsoft: data.microsoft || false,
          loading: false,
        });

        // Auto-select the first available provider
        if (!providerStatus.loading) {
          if (selectedProvider === 'google' && !data.google && data.microsoft) {
            onProviderChange('microsoft');
          } else if (
            selectedProvider === 'microsoft' &&
            !data.microsoft &&
            data.google
          ) {
            onProviderChange('google');
          }
        }
      }
    } catch (error) {
      console.error('Error checking provider connections:', error);
      setProviderStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleProviderClick = (
    provider: 'google' | 'microsoft',
    isConnected: boolean,
  ) => {
    if (isConnected) {
      onProviderChange(provider);
    } else {
      // Show toast with connection instructions
      if (provider === 'google') {
        toast.info('Connect Gmail & Calendar', {
          description:
            'Go to Emails → Click "Connect Gmail & Calendar" to enable Google Meet',
          duration: 4000,
        });
      } else {
        toast.info('Connect Outlook & Calendar', {
          description:
            'Go to Emails → Click "Connect Outlook & Calendar" to enable Microsoft Teams',
          duration: 4000,
        });
      }
    }
  };

  // Get current provider details
  const getCurrentProvider = () => {
    if (selectedProvider === 'google') {
      return {
        name: 'Google Meet',
        icon: <GoogleMeetIcon className="h-5 w-5" />,
        connected: providerStatus.google,
        color: 'text-blue-600',
      };
    } else {
      return {
        name: 'Microsoft Teams',
        icon: <TeamsIcon className="h-6 w-6" />,
        connected: providerStatus.microsoft,
        color: 'text-purple-600',
      };
    }
  };

  const currentProvider = getCurrentProvider();
  const hasAnyConnection = providerStatus.google || providerStatus.microsoft;

  if (providerStatus.loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* <Label>Meeting Platform</Label> */}
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <span className="text-muted-foreground text-sm">
            Checking connections...
          </span>
        </div>
      </div>
    );
  }

  if (!hasAnyConnection) {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* <Label>Meeting Platform</Label> */}
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              No calendar connections found
            </span>
          </div>
          <p className="mt-1 text-xs text-orange-600 dark:text-orange-500">
            Please connect Gmail or Microsoft Calendar to schedule meetings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* <Label>Meeting Platform</Label> */}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="text-foreground h-auto w-full justify-between p-3"
          >
            <div className="flex items-center gap-3">
              {currentProvider.icon}
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium">
                  {currentProvider.name}
                </span>
                {currentProvider.connected ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-full min-w-[300px]" align="start">
          {/* Google Meet Option */}
          <DropdownMenuItem
            onClick={() => handleProviderClick('google', providerStatus.google)}
            className={`cursor-pointer p-3 ${
              selectedProvider === 'google'
                ? 'bg-blue-50 dark:bg-blue-950/20'
                : ''
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <GoogleMeetIcon className="h-6 w-6" />
                <div className="flex flex-col">
                  <span
                    className={`font-medium ${
                      selectedProvider === 'google'
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-foreground'
                    }`}
                  >
                    Google Meet
                  </span>
                  <span
                    className={`text-xs ${
                      selectedProvider === 'google'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Video conferencing by Google
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {providerStatus.google ? (
                  <>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-xs text-green-700 dark:bg-green-950 dark:text-green-400"
                    >
                      Connected
                    </Badge>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </>
                ) : (
                  <>
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-xs text-red-700 dark:bg-red-950 dark:text-red-400"
                    >
                      Not Connected
                    </Badge>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </>
                )}
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Microsoft Teams Option */}
          <DropdownMenuItem
            onClick={() =>
              handleProviderClick('microsoft', providerStatus.microsoft)
            }
            className={`cursor-pointer p-3 ${
              selectedProvider === 'microsoft'
                ? 'bg-purple-50 dark:bg-purple-950/20'
                : ''
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <TeamsIcon className="h-7 w-7" />
                <div className="flex flex-col">
                  <span
                    className={`font-medium ${
                      selectedProvider === 'microsoft'
                        ? 'text-purple-900 dark:text-purple-100'
                        : 'text-foreground'
                    }`}
                  >
                    Microsoft Teams
                  </span>
                  <span
                    className={`text-xs ${
                      selectedProvider === 'microsoft'
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Collaboration platform by Microsoft
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {providerStatus.microsoft ? (
                  <>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-xs text-green-700 dark:bg-green-950 dark:text-green-400"
                    >
                      Connected
                    </Badge>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </>
                ) : (
                  <>
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-xs text-red-700 dark:bg-red-950 dark:text-red-400"
                    >
                      Not Connected
                    </Badge>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </>
                )}
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Connection Status Summary */}
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Video className="h-3 w-3" />
        <span>
          {providerStatus.google && providerStatus.microsoft
            ? 'Both platforms available'
            : providerStatus.google
              ? 'Google Meet available'
              : providerStatus.microsoft
                ? 'Microsoft Teams available'
                : 'No platforms connected'}
        </span>
      </div>
    </div>
  );
}

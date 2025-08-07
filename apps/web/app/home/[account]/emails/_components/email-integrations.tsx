'use client';

import { useState } from 'react';

import {
  Calendar,
  CheckCircle,
  Mail,
  Plus,
  Settings,
  Wifi,
  WifiOff,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';

import { GmailConnectButton } from './gmail-connect-button';
import { OutlookConnectButton } from './outlook-connect-button';
import OutlookSyncButton from './outlook-sync-button';
import SyncButton from './sync-button';

// Logo components
export const GmailLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 49.4 512 399.42"
    fill="none"
    fillRule="evenodd"
  >
    <g fillRule="nonzero">
      <path
        d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z"
        fill="#4285f4"
      />
      <path
        d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z"
        fill="#34a853"
      />
      <path
        d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z"
        fill="#fbbc04"
      />
    </g>
    <path
      d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z"
      fill="#ea4335"
    />
    <path
      d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z"
      fill="#c5221f"
      fillRule="nonzero"
    />
  </svg>
);

export const OutlookLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="-274.66275 -425.834 2380.4105 2555.004">
    <path
      d="M1831.083 894.25a40.879 40.879 0 00-19.503-35.131h-.213l-.767-.426-634.492-375.585a86.175 86.175 0 00-8.517-5.067 85.17 85.17 0 00-78.098 0 86.37 86.37 0 00-8.517 5.067l-634.49 375.585-.766.426c-19.392 12.059-25.337 37.556-13.278 56.948a41.346 41.346 0 0014.257 13.868l634.492 375.585a95.617 95.617 0 008.517 5.068 85.17 85.17 0 0078.098 0 95.52 95.52 0 008.517-5.068l634.492-375.585a40.84 40.84 0 0020.268-35.685z"
      fill="#0A2767"
    />
    <path
      d="M520.453 643.477h416.38v381.674h-416.38zM1745.917 255.5V80.908c1-43.652-33.552-79.862-77.203-80.908H588.204C544.552 1.046 510 37.256 511 80.908V255.5l638.75 170.333z"
      fill="#0364B8"
    />
    <path d="M511 255.5h425.833v383.25H511z" fill="#0078D4" />
    <path
      d="M1362.667 255.5H936.833v383.25L1362.667 1022h383.25V638.75z"
      fill="#28A8EA"
    />
    <path d="M936.833 638.75h425.833V1022H936.833z" fill="#0078D4" />
    <path d="M936.833 1022h425.833v383.25H936.833z" fill="#0364B8" />
    <path d="M520.453 1025.151h416.38v346.969h-416.38z" fill="#14447D" />
    <path d="M1362.667 1022h383.25v383.25h-383.25z" fill="#0078D4" />
    <linearGradient
      gradientTransform="matrix(1 0 0 -1 0 1705.333)"
      y2="1.998"
      x2="1128.458"
      y1="811.083"
      x1="1128.458"
      gradientUnits="userSpaceOnUse"
      id="a"
    >
      <stop offset="0" stopColor="#35b8f1" />
      <stop offset="1" stopColor="#28a8ea" />
    </linearGradient>
    <path
      d="M1811.58 927.593l-.809.426-634.492 356.848c-2.768 1.703-5.578 3.321-8.517 4.769a88.437 88.437 0 01-34.407 8.517l-34.663-20.27a86.706 86.706 0 01-8.517-4.897L447.167 906.003h-.298l-21.036-11.753v722.384c.328 48.196 39.653 87.006 87.849 86.7h1230.914c.724 0 1.363-.341 2.129-.341a107.79 107.79 0 0029.808-6.217 86.066 86.066 0 0011.966-6.217c2.853-1.618 7.75-5.152 7.75-5.152a85.974 85.974 0 0034.833-68.772V894.25a38.323 38.323 0 01-19.502 33.343z"
      fill="url(#a)"
    />
    <path
      d="M1797.017 891.397v44.287l-663.448 456.791-686.87-486.174a.426.426 0 00-.426-.426l-63.023-37.899v-31.938l25.976-.426 54.932 31.512 1.277.426 4.684 2.981s645.563 368.346 647.267 369.197l24.698 14.478c2.129-.852 4.258-1.703 6.813-2.555 1.278-.852 640.879-360.681 640.879-360.681z"
      fill="#0A2767"
      opacity=".5"
    />
    <path
      d="M1811.58 927.593l-.809.468-634.492 356.848c-2.768 1.703-5.578 3.321-8.517 4.769a88.96 88.96 0 01-78.098 0 96.578 96.578 0 01-8.517-4.769l-634.49-356.848-.766-.468a38.326 38.326 0 01-20.057-33.343v722.384c.305 48.188 39.616 87.004 87.803 86.7h1229.64c48.188.307 87.5-38.509 87.807-86.696 0-.001 0 0 0 0V894.25a38.33 38.33 0 01-19.504 33.343z"
      fill="#1490DF"
    />
    <path
      d="M1185.52 1279.629l-9.496 5.323a92.806 92.806 0 01-8.517 4.812 88.173 88.173 0 01-33.47 8.857l241.405 285.479 421.107 101.476a86.785 86.785 0 0026.7-33.343z"
      opacity=".1"
    />
    <path
      d="M1228.529 1255.442l-52.505 29.51a92.806 92.806 0 01-8.517 4.812 88.173 88.173 0 01-33.47 8.857l113.101 311.838 549.538 74.989a86.104 86.104 0 0034.407-68.815v-9.326z"
      opacity=".05"
    />
    <path
      d="M514.833 1703.333h1228.316a88.316 88.316 0 0052.59-17.033l-697.089-408.331a86.706 86.706 0 01-8.517-4.897L447.125 906.088h-.298l-20.993-11.838v719.914c-.048 49.2 39.798 89.122 88.999 89.169-.001 0-.001 0 0 0z"
      fill="#28A8EA"
    />
    <path
      d="M1022 418.722v908.303c-.076 31.846-19.44 60.471-48.971 72.392a73.382 73.382 0 01-28.957 5.962H425.833V383.25H511v-42.583h433.073c43.019.163 77.834 35.035 77.927 78.055z"
      opacity=".1"
    />
    <path
      d="M979.417 461.305v908.302a69.36 69.36 0 01-6.388 29.808c-11.826 29.149-40.083 48.273-71.54 48.417H425.833V383.25h475.656a71.493 71.493 0 0135.344 8.943c26.104 13.151 42.574 39.883 42.584 69.112z"
      opacity=".2"
    />
    <path
      d="M979.417 461.305v823.136c-.208 43-34.928 77.853-77.927 78.225H425.833V383.25h475.656a71.493 71.493 0 0135.344 8.943c26.104 13.151 42.574 39.883 42.584 69.112z"
      opacity=".2"
    />
    <path
      d="M936.833 461.305v823.136c-.046 43.067-34.861 78.015-77.927 78.225H425.833V383.25h433.072c43.062.023 77.951 34.951 77.927 78.013a.589.589 0 01.001.042z"
      opacity=".2"
    />
    <linearGradient
      gradientTransform="matrix(1 0 0 -1 0 1705.333)"
      y2="324.259"
      x2="774.086"
      y1="1383.074"
      x1="162.747"
      gradientUnits="userSpaceOnUse"
      id="b"
    >
      <stop offset="0" stopColor="#1784d9" />
      <stop offset=".5" stopColor="#107ad5" />
      <stop offset="1" stopColor="#0a63c9" />
    </linearGradient>
    <path
      d="M78.055 383.25h780.723c43.109 0 78.055 34.947 78.055 78.055v780.723c0 43.109-34.946 78.055-78.055 78.055H78.055c-43.109 0-78.055-34.947-78.055-78.055V461.305c0-43.108 34.947-78.055 78.055-78.055z"
      fill="url(#b)"
    />
    <path
      d="M243.96 710.631a227.05 227.05 0 0189.17-98.495 269.56 269.56 0 01141.675-35.515 250.91 250.91 0 01131.114 33.683 225.014 225.014 0 0186.742 94.109 303.751 303.751 0 0130.405 138.396 320.567 320.567 0 01-31.299 144.783 230.37 230.37 0 01-89.425 97.388 260.864 260.864 0 01-136.011 34.578 256.355 256.355 0 01-134.01-34.067 228.497 228.497 0 01-87.892-94.28 296.507 296.507 0 01-30.745-136.735 329.29 329.29 0 0130.276-143.845zm95.046 231.227a147.386 147.386 0 0050.163 64.812 131.028 131.028 0 0078.353 23.591 137.244 137.244 0 0083.634-24.358 141.156 141.156 0 0048.715-64.812 251.594 251.594 0 0015.543-90.404 275.198 275.198 0 00-14.649-91.554 144.775 144.775 0 00-47.182-67.537 129.58 129.58 0 00-82.91-25.55 135.202 135.202 0 00-80.184 23.804 148.626 148.626 0 00-51.1 65.365 259.759 259.759 0 00-.341 186.728z"
      fill="#FFF"
    />
    <path d="M1362.667 255.5h383.25v383.25h-383.25z" fill="#50D9FF" />
  </svg>
);

// Microsoft Logo Component
export const MicrosoftLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 23 23" fill="none" fillRule="evenodd">
    <g fillRule="nonzero">
      <path d="M0 0h11v11H0z" fill="#f25022" />
      <path d="M12 0h11v11H12z" fill="#7fba00" />
      <path d="M0 12h11v11H0z" fill="#00a4ef" />
      <path d="M12 12h11v11H12z" fill="#ffb900" />
    </g>
  </svg>
);
export const GoogleLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fillRule="evenodd" clipRule="evenodd">
      <path
        d="M44.5 20H24v8.5h11.8C34.5 33 30 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.5 1 7.5 2.7l6.2-6.2C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.3-.1-2-.3-4z"
        fill="#FFC107"
      />
      <path
        d="M6.3 14.7l6.6 4.8C14.3 16.1 18.8 13 24 13c3 0 5.5 1 7.5 2.7l6.2-6.2C34 5.1 29.3 3 24 3 15.7 3 8.4 8.3 6.3 14.7z"
        fill="#FF3D00"
      />
      <path
        d="M24 45c5.9 0 11.3-2.3 15.3-6l-7.1-5.9c-2.1 1.6-4.8 2.5-8.2 2.5-5.8 0-10.7-3.9-12.4-9.2l-7.1 5.5C7.9 39.5 15.3 45 24 45z"
        fill="#4CAF50"
      />
      <path
        d="M44.5 20H24v8.5h11.8c-1 2.8-3.1 5.1-5.9 6.5l7.1 5.9C41.7 37 45 31.7 45 24c0-1.4-.2-2.7-.5-4z"
        fill="#1976D2"
      />
    </g>
  </svg>
);

interface EmailProvider {
  id: 'gmail' | 'outlook';
  name: string;
  displayName: string;
  icon: React.ReactNode;
  color: {
    badge: string;
    dot: string;
  };
  isConnected: boolean;
  email?: string;
  syncStatus?: string | null;
}

interface EmailIntegrationsProps {
  accountId: string;
  providers: EmailProvider[];
  totalEmails: number;
  className?: string;
}

export function EmailIntegrations({
  accountId,
  providers,
  totalEmails,
  className,
}: EmailIntegrationsProps) {
  const [isManageOpen, setIsManageOpen] = useState(false);

  const connectedProviders = providers.filter((p) => p.isConnected);
  const disconnectedProviders = providers.filter((p) => !p.isConnected);

  const allConnected = providers.every((p) => p.isConnected);
  const anyConnected = providers.some((p) => p.isConnected);

  const getSyncStatusColor = (status?: string | null) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'syncing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getSyncStatusText = (status?: string | null) => {
    switch (status) {
      case 'completed':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Not synced';
    }
  };

  if (!anyConnected) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-2">
              <WifiOff className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <h3 className="font-medium">No Email Providers Connected</h3>
              <p className="text-muted-foreground text-sm">
                Integrate your email and calendar to streamline deal management
                and meeting coordination
              </p>
            </div>
          </div>
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Connect
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <Calendar className="h-5 w-5 text-green-600" />
                  Connect Email Provider
                </DialogTitle>
                <DialogDescription>
                  Choose an email provider to start syncing your deal-related
                  emails and calendar events.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>Automatic email sync with your deals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span>Smart meeting scheduling and transcription</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 text-center">🤖</span>
                    <span>AI insights from your communications</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="grid gap-3">
                    {/* Gmail Card */}
                    <div className="flex items-center gap-4 rounded-lg border p-4">
                      <GoogleLogo className="h-6 w-6" />
                      <div className="flex-1">
                        <GmailConnectButton accountId={accountId} />
                      </div>
                    </div>

                    {/* Outlook Card */}
                    <div className="flex items-center gap-4 rounded-lg border p-4">
                      <MicrosoftLogo className="h-5 w-5" />
                      <div className="flex-1">
                        <OutlookConnectButton accountId={accountId} />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground text-xs">
                  You'll be redirected to authorize access. We only read emails
                  and create calendar events - never send emails without your
                  permission.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">
                  {connectedProviders.length} Email Service
                  {connectedProviders.length !== 1 ? 's' : ''} Connected
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {totalEmails} emails
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {connectedProviders.map((provider) => (
                  <Badge
                    key={provider.id}
                    variant="outline"
                    className={`text-xs ${provider.color.badge}`}
                  >
                    <div className="flex items-center">
                      {provider.id === 'gmail' ? (
                        <GmailLogo className="h-3 w-3" />
                      ) : (
                        <OutlookLogo className="h-4 w-4" />
                      )}
                    </div>
                    <span className="ml-1">{provider.displayName}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick sync buttons for connected providers */}
            {providers.map((provider) => {
              if (!provider.isConnected) return null;

              if (provider.id === 'gmail') {
                return (
                  <SyncButton
                    key={provider.id}
                    accountId={accountId}
                    hasGmailConnected={true}
                    gmailEmail={provider.email}
                    syncStatus={provider.syncStatus}
                  />
                );
              }

              if (provider.id === 'outlook') {
                return (
                  <OutlookSyncButton
                    key={provider.id}
                    accountId={accountId}
                    hasOutlookConnected={true}
                    outlookEmail={provider.email}
                    syncStatus={provider.syncStatus}
                  />
                );
              }
            })}

            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Manage Email Integrations</DialogTitle>
                  <DialogDescription>
                    View and manage your connected email providers.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  {/* Connected Providers */}
                  {connectedProviders.length > 0 && (
                    <div>
                      <h4 className="mb-3 font-medium">Connected Providers</h4>
                      <div className="space-y-3">
                        {connectedProviders.map((provider) => (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between rounded-lg border p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-2 w-2 rounded-full ${provider.color.dot}`}
                              />
                              {/* Use provider-specific logos instead of generic icon */}
                              {provider.id === 'gmail' ? (
                                <GmailLogo className="h-6 w-6" />
                              ) : provider.id === 'outlook' ? (
                                <OutlookLogo className="h-7 w-7" />
                              ) : (
                                provider.icon
                              )}
                              <div>
                                <div className="font-medium">
                                  {provider.displayName}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {provider.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div
                                  className={`text-sm font-medium ${getSyncStatusColor(provider.syncStatus)}`}
                                >
                                  {getSyncStatusText(provider.syncStatus)}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  Last sync status
                                </div>
                              </div>
                              {provider.id === 'gmail' && (
                                <SyncButton
                                  accountId={accountId}
                                  hasGmailConnected={true}
                                  gmailEmail={provider.email}
                                  syncStatus={provider.syncStatus}
                                />
                              )}
                              {provider.id === 'outlook' && (
                                <OutlookSyncButton
                                  accountId={accountId}
                                  hasOutlookConnected={true}
                                  outlookEmail={provider.email}
                                  syncStatus={provider.syncStatus}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Providers */}
                  {disconnectedProviders.length > 0 && (
                    <div>
                      <h4 className="mb-3 font-medium">Available Providers</h4>
                      <div className="space-y-3">
                        {disconnectedProviders.map((provider) => (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between rounded-lg border border-dashed p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-gray-300" />
                              {/* Use provider-specific logos instead of generic icon */}
                              {provider.id === 'gmail' ? (
                                <GmailLogo className="h-6 w-6" />
                              ) : provider.id === 'outlook' ? (
                                <OutlookLogo className="h-7 w-7" />
                              ) : (
                                provider.icon
                              )}
                              <div>
                                <div className="font-medium">
                                  {provider.displayName}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  Not connected
                                </div>
                              </div>
                            </div>
                            {provider.id === 'gmail' && (
                              <GmailConnectButton accountId={accountId} />
                            )}
                            {provider.id === 'outlook' && (
                              <OutlookConnectButton accountId={accountId} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

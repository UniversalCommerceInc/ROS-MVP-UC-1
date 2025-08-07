'use client';

import React from 'react';

import { Badge } from '@kit/ui/badge';
import { Card, CardHeader, CardTitle } from '@kit/ui/card';

import type { AllIntegrationStatus } from '../_lib/server/integrations.service';
import { IntegrationConnectButton } from './integration-connect-button';

// Extended type to ensure Folk and Slack are included
type ExtendedIntegrationStatus = AllIntegrationStatus & {
  folk: { isConnected: boolean };
  slack: { isConnected: boolean };
};

interface IntegrationsGridProps {
  accountId: string;
  accountName: string;
  integrationStatus: ExtendedIntegrationStatus;
}

export function IntegrationsGrid({
  accountId,
  accountName,
  integrationStatus,
}: IntegrationsGridProps) {
  const crmIntegrations = [
    {
      id: 'pipedrive',
      name: 'Pipedrive',
      description: 'Sales CRM',
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="16" fill="#28a745" />
          <path
            d="M24.9842 13.4564C24.9842 17.8851 22.1247 20.914 18.036 20.914C16.0923 20.914 14.4903 20.1136 13.8906 19.1134L13.9189 20.142V26.4847H9.74512V10.0846C9.74512 9.85644 9.68836 9.79843 9.4304 9.79843H8V6.31321H11.4889C13.0896 6.31321 13.4907 7.68461 13.6042 8.28525C14.2337 7.22834 15.8911 6 18.2359 6C22.2679 5.99871 24.9842 8.99802 24.9842 13.4564ZM20.724 13.4847C20.724 11.1131 19.1801 9.48523 17.2351 9.48523C15.6344 9.48523 13.8325 10.5421 13.8325 13.5144C13.8325 15.4568 14.9186 17.4855 17.1783 17.4855C18.837 17.4842 20.724 16.2843 20.724 13.4847Z"
            fill="#FFFFFF"
          />
        </svg>
      ),
      status: integrationStatus.pipedrive,
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Sales CRM',
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 27 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.6142 20.1771C17.5228 20.1771 15.8274 18.4993 15.8274 16.43C15.8274 14.3603 17.5228 12.6825 19.6142 12.6825C21.7057 12.6825 23.401 14.3603 23.401 16.43C23.401 18.4993 21.7057 20.1771 19.6142 20.1771ZM20.7479 9.21551V5.88191C21.6272 5.47091 22.2431 4.59068 22.2431 3.56913V3.49218C22.2431 2.08229 21.0774 0.928781 19.6527 0.928781H19.5754C18.1507 0.928781 16.985 2.08229 16.985 3.49218V3.56913C16.985 4.59068 17.6009 5.47127 18.4802 5.88227V9.21551C17.1711 9.4158 15.9749 9.95012 14.9885 10.7365L5.73944 3.61659C5.80048 3.38467 5.84336 3.14591 5.84372 2.89493C5.84518 1.29842 4.5393 0.00215931 2.92531 1.87311e-06C1.31205 -0.0018 0.00181863 1.29087 1.8933e-06 2.88774C-0.00181848 4.4846 1.30406 5.78087 2.91805 5.78266C3.44381 5.78338 3.9307 5.6356 4.35727 5.3954L13.4551 12.3995C12.6816 13.5552 12.2281 14.9396 12.2281 16.43C12.2281 17.9902 12.7263 19.4335 13.5678 20.6205L10.8012 23.3586C10.5825 23.2935 10.3558 23.2482 10.1152 23.2482C8.78938 23.2482 7.71424 24.3119 7.71424 25.6239C7.71424 26.9364 8.78938 28 10.1152 28C11.4415 28 12.5162 26.9364 12.5162 25.6239C12.5162 25.3866 12.4705 25.1619 12.4047 24.9454L15.1414 22.2371C16.3837 23.1752 17.9308 23.7391 19.6142 23.7391C23.6935 23.7391 27 20.4666 27 16.43C27 12.7757 24.2872 9.75667 20.7479 9.21551Z"
            fill="#f95c35"
          />
        </svg>
      ),
      status: integrationStatus.hubspot,
    },
    {
      id: 'zoho',
      name: 'Zoho CRM',
      description: 'Business Suite CRM',
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 300 300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`.cls-1{fill:#006eb9;}`}</style>
          </defs>
          <g id="logo">
            <path
              className="cls-1"
              d="m204.26,239.24c-24.19,0-46.98-9.37-64.17-26.38l-50.24-50.24c-5.85-5.85-9.06-13.63-9.03-21.9.03-8.27,3.28-16.03,9.16-21.84,12.02-11.88,31.53-11.82,43.48.13l46.01,46.01c5.39,5.39,14.18,5.41,19.59.05,2.65-2.62,4.11-6.11,4.12-9.84.01-3.72-1.43-7.23-4.07-9.86l-50.17-50.17c-14.02-13.87-32.64-21.51-52.38-21.45-20.14.05-38.94,7.96-52.94,22.27-14.02,14.33-21.52,33.32-21.12,53.47.79,40.11,34.09,72.75,74.23,72.75,7.18,0,14.27-1.02,21.08-3.03,4.5-1.33,9.23,1.24,10.55,5.74,1.33,4.5-1.24,9.23-5.74,10.56-8.37,2.47-17.08,3.73-25.89,3.73-49.33,0-90.25-40.11-91.22-89.41-.49-24.75,8.73-48.08,25.96-65.69,17.22-17.6,40.32-27.33,65.05-27.38,24.15-.06,47.14,9.31,64.39,26.38l50.22,50.22c5.85,5.86,9.07,13.64,9.05,21.92-.02,8.28-3.28,16.05-9.16,21.87-12.04,11.91-31.58,11.86-43.56-.12l-46.01-46.01c-5.37-5.37-14.12-5.39-19.52-.06-2.64,2.61-4.1,6.09-4.11,9.81-.01,3.71,1.43,7.21,4.05,9.83l50.19,50.2c13.97,13.82,32.52,21.45,52.2,21.45,40.9,0,74.21-33.27,74.25-74.17.02-19.82-7.7-38.48-21.74-52.54-14.04-14.06-32.69-21.8-52.51-21.8-6.32,0-12.59.79-18.65,2.36-.88.23-1.76.47-2.63.73-4.5,1.34-9.23-1.22-10.57-5.71-1.34-4.5,1.22-9.23,5.71-10.57,1.07-.32,2.15-.62,3.23-.9,7.44-1.92,15.15-2.9,22.9-2.9,24.36,0,47.28,9.51,64.53,26.78,17.25,17.27,26.74,40.2,26.71,64.56-.05,50.26-40.99,91.14-91.24,91.14Z"
            />
          </g>
        </svg>
      ),
      status: integrationStatus.zoho,
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Enterprise CRM',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 92 64"
        >
          <path
            fill="#0d9dda"
            d="m38.33,6.98c2.95-3.07,7.05-4.98,11.59-4.98,6.04,0,11.3,3.37,14.1,8.36,2.44-1.09,5.13-1.7,7.97-1.7,10.89,0,19.71,8.9,19.71,19.88s-8.82,19.88-19.71,19.88c-1.33,0-2.63-.13-3.88-.39-2.47,4.4-7.18,7.38-12.58,7.38-2.26,0-4.4-.52-6.3-1.45-2.5,5.89-8.34,10.02-15.13,10.02s-13.11-4.48-15.43-10.76c-1.01.21-2.06.33-3.14.33-8.43,0-15.26-6.9-15.26-15.42,0-5.71,3.07-10.69,7.63-13.36-.94-2.16-1.46-4.55-1.46-7.05C6.45,7.94,14.41,0,24.21,0C29.97,0,35.09,2.74,38.33,6.98Z"
          />
        </svg>
      ),
      status: integrationStatus.salesforce,
    },
    {
      id: 'folk',
      name: 'Folk',
      description: 'Modern CRM',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M11.8 18h0.4c3.2 0 5.8-2.5 5.9-5.5 0-0.2-0.1-0.3-0.3-0.3H6.3c-0.2 0-0.3 0.1-0.3 0.3 0.1 3 2.6 5.5 5.8 5.5z"
            fill="currentColor"
          />
        </svg>
      ),
      status: integrationStatus.folk,
    },
  ];

  const botIntegrations = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Slackbot',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path
            d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
            fill="#e01e5a"
          />
          <path
            d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
            fill="#36c5f0"
          />
          <path
            d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
            fill="#2eb67d"
          />
          <path
            d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
            fill="#ecb22e"
          />
          <path
            d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
            fill="#e01e5a"
          />
        </svg>
      ),
      status: integrationStatus.slack,
    },
  ];

  return (
    <div className="space-y-8">
      {/* CRM Integrations Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">CRM Integrations</h2>
          <p className="text-muted-foreground text-sm">
            Connect with industry-leading platforms to unlock powerful insights
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {crmIntegrations.map((integration) => (
            <Card key={integration.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-background flex h-10 w-10 items-center justify-center rounded-lg border">
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">
                        {integration.name}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      integration.status.isConnected ? 'default' : 'outline'
                    }
                  >
                    {integration.status.isConnected ? 'Connected' : 'Available'}
                  </Badge>
                </div>

                <div className="pt-4">
                  <IntegrationConnectButton
                    platform={integration.id}
                    accountId={accountId}
                    accountName={accountName}
                    isConnected={integration.status.isConnected}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-10">
        <div className="border-muted-foreground/20 dark:border-muted/30 border-t" />
      </div>

      {/* Bot Integrations Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Slack Bot Integration</h2>
          <p className="text-muted-foreground text-sm">
            Receive automated deal updates directly in Slack
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {botIntegrations.map((integration) => (
            <Card key={integration.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-background flex h-10 w-10 items-center justify-center rounded-lg border">
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">
                        {integration.name}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      integration.status.isConnected ? 'default' : 'outline'
                    }
                  >
                    {integration.status.isConnected ? 'Connected' : 'Available'}
                  </Badge>
                </div>

                <div className="pt-4">
                  <IntegrationConnectButton
                    platform={integration.id}
                    accountId={accountId}
                    accountName={accountName}
                    isConnected={integration.status.isConnected}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

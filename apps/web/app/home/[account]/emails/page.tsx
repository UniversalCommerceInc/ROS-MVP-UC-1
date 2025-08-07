// import { Metadata } from 'next';
// import { redirect } from 'next/navigation';
// import { getSupabaseServerClient } from '@kit/supabase/server-client';
// import { Alert, AlertDescription } from '@kit/ui/alert';
// import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
// import { Badge } from '@kit/ui/badge';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@kit/ui/card';
// import { If } from '@kit/ui/if';
// import { PageBody } from '@kit/ui/page';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
// import { Trans } from '@kit/ui/trans';
// import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
// import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
// import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';
// import EmailList from './_components/email-list';
// import { GmailConnectButton } from './_components/gmail-connect-button';
// import { MicrosoftConnectButton } from './_components/microsoft-connect-buton';
// import MicrosoftSyncButton from './_components/microsoft-sync-button';
// import SyncButton from './_components/sync-button';
// import { getDealRelatedEmails } from './_lib/actions/gmail';
// import { getGmailIntegrationStatus } from './_lib/server/emails.service';
// import { getMicrosoftIntegrationStatus } from './_lib/server/microsoft.service';
// export const generateMetadata = async () => {
//   const i18n = await createI18nServerInstance();
//   const title = i18n.t('common:emails');
//   return {
//     title,
//   };
// };
// interface DealContext {
//   contact: {
//     id: string;
//     name: string;
//     email: string;
//     role: string;
//     is_decision_maker: boolean;
//   };
//   deal: {
//     id: string;
//     company_name: string;
//     stage: string;
//     value: string;
//   };
// }
// interface DealEmail {
//   id: string;
//   subject: string | null;
//   from_name: string | null;
//   from_email: string;
//   to_email: string[] | null;
//   body_text: string | null;
//   body_html: string | null;
//   received_at: string;
//   is_read: boolean;
//   is_starred: boolean;
//   dealContext?: DealContext[];
// }
// export default async function EmailsPage({
//   params,
//   searchParams,
// }: {
//   params: Promise<{ account: string }>;
//   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
// }) {
//   // Get account ID from workspace
//   const resolvedParams = await params;
//   const account = resolvedParams.account;
//   // Get the current team workspace to access the account ID
//   const workspace = await loadTeamWorkspace(account);
//   const accountId = workspace.account.id;
//   // Get the current user
//   const supabase = getSupabaseServerClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   // Redirect to login if not authenticated
//   if (!user) {
//     redirect('/auth/login');
//   }
//   // Get Gmail and Microsoft integration status
//   const gmailIntegrationStatus = await getGmailIntegrationStatus(accountId);
//   const microsoftIntegrationStatus =
//     await getMicrosoftIntegrationStatus(accountId);
//   // Await searchParams before using
//   const resolvedSearchParams = await searchParams;
//   // Get deal-related emails
//   const limit = 20;
//   const offset = resolvedSearchParams.offset
//     ? parseInt(resolvedSearchParams.offset as string, 10)
//     : 0;
//   const search = (resolvedSearchParams.search as string) || '';
//   const dealId = (resolvedSearchParams.dealId as string) || '';
//   const emailsResponse = await getDealRelatedEmails(accountId, {
//     limit,
//     offset,
//     search,
//     dealId,
//   });
//   const emails: DealEmail[] = emailsResponse.success
//     ? emailsResponse.emails || []
//     : [];
//   // Get all deals for the filter dropdown
//   const {
//     data: deals,
//   }: { data: { id: string; company_name: string; stage: string }[] | null } =
//     await supabase
//       .from('deals')
//       .select('id, company_name, stage')
//       .eq('account_id', accountId)
//       .order('created_at', { ascending: false });
//   // Check if account has Gmail connected
//   const { data: gmailTokens } = await supabase
//     .from('gmail_tokens')
//     .select('email_address, expires_at, sync_status')
//     .eq('account_id', accountId);
//   const hasGmailConnected = !!(gmailTokens && gmailTokens.length > 0);
//   // Check if account has Microsoft connected
//   const { data: microsoftTokens } = await supabase
//     .from('microsoft_tokens')
//     .select('email_address, expires_at, sync_status')
//     .eq('account_id', accountId);
//   const hasMicrosoftConnected = !!(
//     microsoftTokens && microsoftTokens.length > 0
//   );
//   // Determine if any email provider is connected
//   const hasAnyEmailConnected = hasGmailConnected || hasMicrosoftConnected;
//   return (
//     <>
//       <TeamAccountLayoutPageHeader
//         account={account}
//         title={<Trans i18nKey={'common:emails'} />}
//         description={<AppBreadcrumbs />}
//       />
//       <PageBody>
//         <If condition={!hasAnyEmailConnected}>
//           <Alert>
//             <AlertDescription>
//               <div className="flex items-center justify-between">
//                 <span>
//                   Connect Gmail or Microsoft Outlook to get started with email
//                   management and deal communication tracking.
//                 </span>
//                 <div className="flex gap-2">
//                   <GmailConnectButton accountId={accountId} />
//                   <MicrosoftConnectButton accountId={accountId} />
//                 </div>
//               </div>
//             </AlertDescription>
//           </Alert>
//         </If>
//         <If condition={hasAnyEmailConnected}>
//           <div className="container pb-10">
//             <div className="mb-8">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h1 className="text-3xl font-bold tracking-tight">
//                     Deal Emails
//                   </h1>
//                   <p className="text-muted-foreground mt-2">
//                     View and manage emails related to your deals and contacts.
//                   </p>
//                 </div>
//                 {/* Email Provider Integration Status and Sync Buttons */}
//                 <div className="flex flex-col gap-4">
//                   {/* Gmail Integration */}
//                   {hasGmailConnected && (
//                     <div className="flex items-center gap-4">
//                       <div className="flex items-center gap-2">
//                         <Badge
//                           variant="outline"
//                           className="border-blue-200 bg-blue-50 text-blue-700"
//                         >
//                           Gmail Connected
//                         </Badge>
//                         <span className="text-muted-foreground text-sm">
//                           {gmailTokens?.[0]?.email_address}
//                         </span>
//                       </div>
//                       <SyncButton
//                         accountId={accountId}
//                         hasGmailConnected={hasGmailConnected}
//                         gmailEmail={gmailTokens?.[0]?.email_address}
//                         syncStatus={gmailTokens?.[0]?.sync_status}
//                       />
//                     </div>
//                   )}
//                   {/* Microsoft Integration */}
//                   {hasMicrosoftConnected && (
//                     <div className="flex items-center gap-4">
//                       <div className="flex items-center gap-2">
//                         <Badge
//                           variant="outline"
//                           className="border-orange-200 bg-orange-50 text-orange-700"
//                         >
//                           Microsoft Connected
//                         </Badge>
//                         <span className="text-muted-foreground text-sm">
//                           {microsoftTokens?.[0]?.email_address}
//                         </span>
//                       </div>
//                       <MicrosoftSyncButton
//                         accountId={accountId}
//                         hasMicrosoftConnected={hasMicrosoftConnected}
//                         microsoftEmail={microsoftTokens?.[0]?.email_address}
//                         syncStatus={microsoftTokens?.[0]?.sync_status}
//                       />
//                     </div>
//                   )}
//                   {/* Add more providers section */}
//                   {!hasGmailConnected && hasMicrosoftConnected && (
//                     <div className="flex items-center gap-2">
//                       <span className="text-muted-foreground text-sm">
//                         Also connect:
//                       </span>
//                       <GmailConnectButton accountId={accountId} size="sm" />
//                     </div>
//                   )}
//                   {hasGmailConnected && !hasMicrosoftConnected && (
//                     <div className="flex items-center gap-2">
//                       <span className="text-muted-foreground text-sm">
//                         Also connect:
//                       </span>
//                       <MicrosoftConnectButton accountId={accountId} size="sm" />
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//             <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//               <div className="md:col-span-2">
//                 <Tabs defaultValue="all-deals">
//                   <TabsList className="mb-4">
//                     <TabsTrigger value="all-deals">All Deal Emails</TabsTrigger>
//                     <TabsTrigger value="recent">Recent</TabsTrigger>
//                     <TabsTrigger value="starred">Starred</TabsTrigger>
//                   </TabsList>
//                   <TabsContent value="all-deals" className="space-y-4">
//                     <EmailList emails={emails} />
//                   </TabsContent>
//                   <TabsContent value="recent" className="space-y-4">
//                     <div className="text-muted-foreground py-10 text-center">
//                       Recent emails will appear here.
//                     </div>
//                   </TabsContent>
//                   <TabsContent value="starred" className="space-y-4">
//                     <div className="text-muted-foreground py-10 text-center">
//                       Starred emails will appear here.
//                     </div>
//                   </TabsContent>
//                 </Tabs>
//               </div>
//               <div className="space-y-6">
//                 {/* Email Provider Status Cards */}
//                 <Card className="bg-card border-border">
//                   <CardHeader className="pb-3">
//                     <CardTitle className="text-sm">
//                       Email Integrations
//                     </CardTitle>
//                     <CardDescription className="text-xs">
//                       Connected email providers
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-3">
//                     {/* Gmail Status */}
//                     <div className="bg-muted/50 flex items-center justify-between rounded-md p-2">
//                       <div className="flex items-center gap-2">
//                         <div
//                           className={`h-2 w-2 rounded-full ${hasGmailConnected ? 'bg-green-500' : 'bg-gray-300'}`}
//                         />
//                         <span className="text-sm font-medium">Gmail</span>
//                       </div>
//                       {hasGmailConnected ? (
//                         <Badge variant="secondary" className="text-xs">
//                           Connected
//                         </Badge>
//                       ) : (
//                         <GmailConnectButton
//                           accountId={accountId}
//                           size="sm"
//                           variant="ghost"
//                         >
//                           Connect
//                         </GmailConnectButton>
//                       )}
//                     </div>
//                     {/* Microsoft Status */}
//                     <div className="bg-muted/50 flex items-center justify-between rounded-md p-2">
//                       <div className="flex items-center gap-2">
//                         <div
//                           className={`h-2 w-2 rounded-full ${hasMicrosoftConnected ? 'bg-green-500' : 'bg-gray-300'}`}
//                         />
//                         <span className="text-sm font-medium">Microsoft</span>
//                       </div>
//                       {hasMicrosoftConnected ? (
//                         <Badge variant="secondary" className="text-xs">
//                           Connected
//                         </Badge>
//                       ) : (
//                         <MicrosoftConnectButton
//                           accountId={accountId}
//                           size="sm"
//                           variant="ghost"
//                         >
//                           Connect
//                         </MicrosoftConnectButton>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//                 {/* Deal Filter */}
//                 {deals && deals.length > 0 && (
//                   <Card className="bg-card border-border">
//                     <CardHeader className="pb-3">
//                       <CardTitle className="text-sm">Filter by Deal</CardTitle>
//                     </CardHeader>
//                     <CardContent className="space-y-2">
//                       <div className="space-y-1">
//                         <a
//                           href={`/home/${account}/emails`}
//                           className={`block rounded-md p-2 text-sm transition-colors ${
//                             !dealId ? 'bg-muted' : 'hover:bg-muted'
//                           }`}
//                         >
//                           All Deals
//                         </a>
//                         {deals.map((deal) => (
//                           <a
//                             key={deal.id}
//                             href={`/home/${account}/emails?dealId=${deal.id}`}
//                             className={`block rounded-md p-2 text-sm transition-colors ${
//                               dealId === deal.id ? 'bg-muted' : 'hover:bg-muted'
//                             }`}
//                           >
//                             <div className="flex items-center justify-between">
//                               <span className="truncate">
//                                 {deal.company_name}
//                               </span>
//                               <Badge variant="secondary" className="text-xs">
//                                 {deal.stage}
//                               </Badge>
//                             </div>
//                           </a>
//                         ))}
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )}
//                 {/* Email Statistics */}
//                 <Card className="bg-card border-border">
//                   <CardHeader className="pb-3">
//                     <CardTitle className="text-sm">Email Statistics</CardTitle>
//                   </CardHeader>
//                   <CardContent className="space-y-3">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-muted-foreground">
//                         Total Emails:
//                       </span>
//                       <span className="font-medium">{emails.length}</span>
//                     </div>
//                     {hasGmailConnected && (
//                       <div className="flex justify-between text-sm">
//                         <span className="text-muted-foreground">
//                           Gmail Status:
//                         </span>
//                         <Badge
//                           variant={
//                             gmailTokens?.[0]?.sync_status === 'completed'
//                               ? 'default'
//                               : 'secondary'
//                           }
//                           className="text-xs"
//                         >
//                           {gmailTokens?.[0]?.sync_status || 'pending'}
//                         </Badge>
//                       </div>
//                     )}
//                     {hasMicrosoftConnected && (
//                       <div className="flex justify-between text-sm">
//                         <span className="text-muted-foreground">
//                           Microsoft Status:
//                         </span>
//                         <Badge
//                           variant={
//                             microsoftTokens?.[0]?.sync_status === 'completed'
//                               ? 'default'
//                               : 'secondary'
//                           }
//                           className="text-xs"
//                         >
//                           {microsoftTokens?.[0]?.sync_status || 'pending'}
//                         </Badge>
//                       </div>
//                     )}
//                   </CardContent>
//                 </Card>
//               </div>
//             </div>
//           </div>
//         </If>
//       </PageBody>
//     </>
//   );
// }
// page.tsx - Improved version
import { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { Calendar, Mail } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { If } from '@kit/ui/if';
import { PageBody } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';
import { EmailIntegrations } from './_components/email-integrations';
import EmailList from './_components/email-list';
import { getDealRelatedEmails } from './_lib/actions/gmail';
import { getGmailIntegrationStatus } from './_lib/server/emails.service';
import { getMicrosoftIntegrationStatus } from './_lib/server/microsoft.service';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('common:emails');

  return {
    title,
  };
};

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

export default async function EmailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Get account ID from workspace
  const resolvedParams = await params;
  const account = resolvedParams.account;

  // Get the current team workspace to access the account ID
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  // Get the current user
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/login');
  }

  // Get integration status
  const gmailIntegrationStatus = await getGmailIntegrationStatus(accountId);
  const microsoftIntegrationStatus =
    await getMicrosoftIntegrationStatus(accountId);

  // Get tokens for both providers
  const { data: gmailTokens } = await supabase
    .from('gmail_tokens')
    .select('email_address, expires_at, sync_status')
    .eq('account_id', accountId);

  const { data: microsoftTokens } = await supabase
    .from('microsoft_tokens')
    .select('email_address, expires_at, sync_status')
    .eq('account_id', accountId);

  const hasGmailConnected = !!(gmailTokens && gmailTokens.length > 0);
  const hasMicrosoftConnected = !!(
    microsoftTokens && microsoftTokens.length > 0
  );
  const hasAnyEmailConnected = hasGmailConnected || hasMicrosoftConnected;

  // Prepare email providers data
  const emailProviders = [
    {
      id: 'gmail' as const,
      name: 'gmail',
      displayName: 'Gmail',
      icon: <Mail className="h-4 w-4" />,
      color: {
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
      },
      isConnected: hasGmailConnected,
      email: gmailTokens?.[0]?.email_address,
      syncStatus: gmailTokens?.[0]?.sync_status,
    },
    {
      id: 'outlook' as const,
      name: 'outlook',
      displayName: 'Outlook',
      icon: <Mail className="h-4 w-4" />,
      color: {
        badge: 'border-orange-200 bg-orange-50 text-orange-700',
        dot: 'bg-orange-500',
      },
      isConnected: hasMicrosoftConnected,
      email: microsoftTokens?.[0]?.email_address,
      syncStatus: microsoftTokens?.[0]?.sync_status,
    },
  ];

  // Get deal-related emails
  const resolvedSearchParams = await searchParams;
  const limit = 20;
  const offset = resolvedSearchParams.offset
    ? parseInt(resolvedSearchParams.offset as string, 10)
    : 0;
  const search = (resolvedSearchParams.search as string) || '';
  const dealId = (resolvedSearchParams.dealId as string) || '';

  const emailsResponse = await getDealRelatedEmails(accountId, {
    limit,
    offset,
    search,
    dealId,
  });

  const emails: DealEmail[] = emailsResponse.success
    ? emailsResponse.emails || []
    : [];

  // Get all deals for the filter dropdown
  const { data: deals } = await supabase
    .from('deals')
    .select('id, company_name, stage')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:emails'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="container pb-10">
          {/* Clean header with title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Deal Emails</h1>
            <p className="text-muted-foreground mt-2">
              View and manage emails related to your deals and contacts.
            </p>
          </div>

          {/* Email Integrations Card */}
          <div className="mb-8">
            <EmailIntegrations
              accountId={accountId}
              providers={emailProviders}
              totalEmails={emails.length}
            />
          </div>

          {/* Main Content - Only show if emails are connected */}
          <If condition={hasAnyEmailConnected}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Email List - Takes up 3/4 of the width */}
              <div className="lg:col-span-3">
                <Tabs defaultValue="all-deals" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="all-deals">All Deal Emails</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                    <TabsTrigger value="starred">Starred</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all-deals" className="space-y-4">
                    <EmailList emails={emails} />
                  </TabsContent>

                  <TabsContent value="recent" className="space-y-4">
                    <div className="text-muted-foreground py-10 text-center">
                      <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>Recent emails will appear here.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="starred" className="space-y-4">
                    <div className="text-muted-foreground py-10 text-center">
                      <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>Starred emails will appear here.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar - Takes up 1/4 of the width */}
              <div className="space-y-6">
                {/* Deal Filter Card */}
                {deals && deals.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Filter by Deal</CardTitle>
                      <CardDescription className="text-xs">
                        Show emails for specific deals
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1">
                        <a
                          href={`/home/${account}/emails`}
                          className={`block rounded-md p-2 text-sm transition-colors ${
                            !dealId
                              ? 'bg-muted font-medium'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          All Deals
                        </a>
                        {deals.map((deal) => (
                          <a
                            key={deal.id}
                            href={`/home/${account}/emails?dealId=${deal.id}`}
                            className={`block rounded-md p-2 text-sm transition-colors ${
                              dealId === deal.id
                                ? 'bg-muted font-medium'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">
                                {deal.company_name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                {deal.stage}
                              </Badge>
                            </div>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Email Statistics Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Email Overview</CardTitle>
                    <CardDescription className="text-xs">
                      Current email statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Emails:
                      </span>
                      <span className="font-medium">{emails.length}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Connected Providers:
                      </span>
                      <span className="font-medium">
                        {emailProviders.filter((p) => p.isConnected).length} of{' '}
                        {emailProviders.length}
                      </span>
                    </div>

                    {hasGmailConnected && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gmail:</span>
                        <Badge
                          variant={
                            gmailTokens?.[0]?.sync_status === 'completed'
                              ? 'default'
                              : gmailTokens?.[0]?.sync_status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {gmailTokens?.[0]?.sync_status || 'pending'}
                        </Badge>
                      </div>
                    )}

                    {hasMicrosoftConnected && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Microsoft:
                        </span>
                        <Badge
                          variant={
                            microsoftTokens?.[0]?.sync_status === 'completed'
                              ? 'default'
                              : microsoftTokens?.[0]?.sync_status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {microsoftTokens?.[0]?.sync_status || 'pending'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </If>
        </div>
      </PageBody>
    </>
  );
}

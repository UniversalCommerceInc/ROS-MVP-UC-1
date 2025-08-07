// ===========================================
// dealflow/[id]/page.tsx (Enhanced with proper navigation and styling)
// ===========================================
import { notFound } from 'next/navigation';

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Edit,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { loadTeamWorkspace } from '../../_lib/server/team-account-workspace.loader';
// import { BackToDealflow } from '../_components/back-to-dealflow';
import { loadDeal } from '../_lib/server/deals.loader';

interface DealDetailPageProps {
  params: Promise<{ account: string; id: string }>;
  searchParams?: Promise<{ view?: string }>;
}

export const generateMetadata = async (props: DealDetailPageProps) => {
  const params = await props.params;
  const deal = await loadDeal(params.id);
  const i18n = await createI18nServerInstance();

  if (!deal) {
    return {
      title: i18n.t('common:notFound'),
    };
  }

  return {
    title: `${deal.company_name} - ${i18n.t('common:dealflow')}`,
  };
};

function getMomentumIcon(trend: string) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'steady':
      return <Activity className="text-muted-foreground h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
}

function getStageVariant(stage: string) {
  switch (stage) {
    case 'interested':
      return 'secondary';
    case 'qualified':
      return 'outline';
    case 'demo':
      return 'default';
    case 'proposal':
      return 'default';
    case 'closed-won':
      return 'default';
    case 'closed-lost':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getMomentumColor(momentum: number) {
  if (momentum > 60) return 'text-emerald-500';
  if (momentum < 30) return 'text-red-500';
  return 'text-amber-500';
}

async function DealDetailPage(props: DealDetailPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { account, id } = params;
  const currentView = searchParams?.view || 'traditional';

  // Get the current team workspace
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  // Load the specific deal
  const deal = await loadDeal(id);

  if (!deal) {
    notFound();
  }

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={
          <div className="flex items-center gap-3">
            {/* <BackToDealflow accountId={accountId} currentView={currentView} /> */}
            <span>{deal.company_name}</span>
          </div>
        }
        description={<AppBreadcrumbs />}
      >
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Edit Deal
        </Button>
      </TeamAccountLayoutPageHeader>

      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Deal Information */}
          <div className="space-y-6 lg:col-span-2">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Deal Overview
                  <Badge variant={getStageVariant(deal.stage)}>
                    {deal.stage
                      .replace('-', ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-muted-foreground text-sm font-medium">
                      Company
                    </h4>
                    <p className="text-lg font-semibold">{deal.company_name}</p>
                  </div>
                  <div>
                    <h4 className="text-muted-foreground text-sm font-medium">
                      Industry
                    </h4>
                    <p className="text-lg">{deal.industry}</p>
                  </div>
                  <div>
                    <h4 className="text-muted-foreground text-sm font-medium">
                      Deal Value
                    </h4>
                    <p className="text-lg font-semibold text-emerald-600">
                      {deal.value_currency} {deal.value_amount?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-muted-foreground text-sm font-medium">
                      Primary Contact
                    </h4>
                    <p className="text-lg">{deal.primary_contact}</p>
                  </div>
                  {deal.primary_email && (
                    <div>
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Email
                      </h4>
                      <p className="text-lg">{deal.primary_email}</p>
                    </div>
                  )}
                  {deal.deal_title && (
                    <div>
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Deal Title
                      </h4>
                      <p className="text-lg">{deal.deal_title}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Next Action Card */}
            {deal.nextAction && (
              <Card>
                <CardHeader>
                  <CardTitle>Next Action</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{deal.nextAction}</p>
                </CardContent>
              </Card>
            )}

            {/* Pain Points */}
            {deal.painPoints && deal.painPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pain Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {deal.painPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {deal.nextSteps && deal.nextSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {deal.nextSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Momentum Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getMomentumIcon(deal.momentumTrend)}
                  Deal Momentum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-muted-foreground text-sm font-medium">
                      Current Momentum
                    </h4>
                    <p
                      className={`text-2xl font-bold ${getMomentumColor(deal.momentum)}`}
                    >
                      {deal.momentum}%
                    </p>
                  </div>
                  <div>
                    <h4 className="text-muted-foreground text-sm font-medium">
                      Trend
                    </h4>
                    <div className="flex items-center gap-2">
                      {getMomentumIcon(deal.momentumTrend)}
                      <span className="capitalize">{deal.momentumTrend}</span>
                    </div>
                  </div>
                  {deal.lastMomentumChange && (
                    <div>
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Last Updated
                      </h4>
                      <p className="text-sm">
                        {new Date(deal.lastMomentumChange).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Deal Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-muted-foreground text-sm font-medium">
                      Created
                    </h4>
                    <p className="text-sm">
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {deal.closeDate && (
                    <div>
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Expected Close
                      </h4>
                      <p className="text-sm">
                        {new Date(deal.closeDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {deal.probability && (
                    <div>
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Win Probability
                      </h4>
                      <p className="text-sm font-semibold">
                        {deal.probability}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Company Details */}
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deal.companySize && (
                    <div>
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Company Size
                      </h4>
                      <p className="text-sm">{deal.companySize}</p>
                    </div>
                  )}
                  {deal.website && (
                    <div>
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Website
                      </h4>
                      <a
                        href={deal.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {deal.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}

export default DealDetailPage;

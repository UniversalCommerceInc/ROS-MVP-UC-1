// apps/web/app/dealflow/page.tsx or app/dealflow/DealFlowPageServer.tsx
// import 'server-only';
import '../../../../styles/designer-colors.css';
import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';
import DealFlowClient from './_components/deal-flow-client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function DealFlowPageServer({
  params,
}: {
  params: { account: string };
}) {
  const awaitedParams = await params;
  const workspace = await loadTeamWorkspace(awaitedParams.account);

  return <DealFlowClient 
    accountId={workspace.account.id} 
    accountSlug={workspace.account.slug}
    userId={workspace.user.id}
  />;
}

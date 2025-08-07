// ===========================================
// dealflow/_lib/utils.ts (Updated with proper enum mapping)
// ===========================================
import { DealStage, MomentumTrend } from './types';

export function getStageIconName(stage: DealStage): string {
  switch (stage) {
    case 'interested':
      return 'eye';
    case 'contacted':
      return 'users';
    case 'demo':
      return 'message-square';
    case 'proposal':
      return 'dollar-sign';
    case 'negotiation':
      return 'handshake';
    case 'won':
      return 'check-circle-2';
    case 'lost':
      return 'x-circle';
    default:
      return 'building-2';
  }
}

export function getStageIconColor(stage: DealStage): string {
  switch (stage) {
    case 'interested':
      return 'text-blue-600 dark:text-blue-400';
    case 'contacted':
      return 'text-purple-600 dark:text-purple-400';
    case 'demo':
      return 'text-amber-600 dark:text-amber-400';
    case 'proposal':
      return 'text-orange-600 dark:text-orange-400';
    case 'negotiation':
      return 'text-indigo-600 dark:text-indigo-400';
    case 'won':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'lost':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();

  if (diffInMs < 0) return 'Just now'; // Future date safety

  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) return `${diffInDays}d ago`;
  if (diffInHours > 0) return `${diffInHours}h ago`;
  if (diffInMinutes > 0) return `${diffInMinutes}m ago`;
  return 'Just now';
}

// Updated to work with database enum values (display actual enum values in UI)
export function getMomentumIconName(trend: MomentumTrend): string {
  switch (trend) {
    case 'up':
      return 'trending-up';
    case 'down':
      return 'trending-down';
    case 'steady':
      return 'activity';
    default:
      return 'activity';
  }
}

// Updated to work with database enum values (display actual enum values in UI)
export function getMomentumIconColor(trend: MomentumTrend): string {
  switch (trend) {
    case 'up':
      return 'text-emerald-500';
    case 'down':
      return 'text-red-500';
    case 'steady':
      return 'text-amber-500';
    default:
      return 'text-amber-500';
  }
}

export function getMomentumColor(momentum: number): string {
  if (momentum > 70) return 'text-emerald-600';
  if (momentum < 40) return 'text-red-600';
  return 'text-amber-600';
}

// Helper function to determine if a deal is stalled based on momentum value
export function isDealStalled(momentum: number): boolean {
  return momentum <= 10;
}

// Helper function to get momentum status text (returns actual database enum values)
export function getMomentumStatusText(
  momentum: number,
  trend: MomentumTrend,
): string {
  if (isDealStalled(momentum)) return 'stalled';
  return trend; // Return the actual database enum value: 'up', 'down', or 'steady'
}

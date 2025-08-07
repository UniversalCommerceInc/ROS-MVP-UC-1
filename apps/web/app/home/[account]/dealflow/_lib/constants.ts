// // ===========================================
// // dealflow/_lib/constants.ts (Updated with your database enum values)
// // ===========================================
// import { DealStage } from './types';
// export const DEAL_STAGES: DealStage[] = [
//   'interested',
//   'qualified',
//   'demo',
//   'proposal',
//   'closed-won',
//   'closed-lost',
//   'follow-up-later',
// ];
// export const STAGE_CONFIG = {
//   interested: {
//     label: 'Interested',
//     color:
//       'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30',
//     icon: 'eye',
//     probability: 15,
//     progression: 15,
//     dbValue: 'interested',
//   },
//   qualified: {
//     label: 'Qualified/Contacted',
//     color:
//       'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30',
//     icon: 'users',
//     probability: 35,
//     progression: 35,
//     dbValue: 'contacted', // Maps to your 'contacted' enum
//   },
//   demo: {
//     label: 'Demo',
//     color:
//       'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30',
//     icon: 'message-square',
//     probability: 55,
//     progression: 55,
//     dbValue: 'demo',
//   },
//   proposal: {
//     label: 'Proposal',
//     color:
//       'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30',
//     icon: 'dollar-sign',
//     probability: 75,
//     progression: 75,
//     dbValue: 'proposal',
//   },
//   'closed-won': {
//     label: 'Closed Won',
//     color:
//       'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30',
//     icon: 'check-circle-2',
//     probability: 100,
//     progression: 100,
//     dbValue: 'won', // Maps to your 'won' enum
//   },
//   'closed-lost': {
//     label: 'Closed Lost',
//     color: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30',
//     icon: 'activity',
//     probability: 0,
//     progression: 0,
//     dbValue: 'lost', // Maps to your 'lost' enum
//   },
//   'follow-up-later': {
//     label: 'Follow Up Later',
//     color:
//       'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800/30',
//     icon: 'building-2',
//     probability: 20,
//     progression: 20,
//     dbValue: 'negotiation',
//   },
// } as const;
// // Reverse mapping for database values to UI stages
// export const DB_STAGE_TO_UI: Record<string, DealStage> = {
//   interested: 'interested',
//   contacted: 'qualified',
//   demo: 'demo',
//   proposal: 'proposal',
//   negotiation: 'follow-up-later', // You might want to create a separate "negotiation" stage
//   won: 'closed-won',
//   lost: 'closed-lost',
// };
// // Column width for proper kanban display
// export const COLUMN_WIDTH = 320; // px
// export const COLUMN_GAP = 16; // px
// export const MIN_VIEWPORT_WIDTH =
//   DEAL_STAGES.length * (COLUMN_WIDTH + COLUMN_GAP);
// ===========================================
// dealflow/_lib/constants.ts (Fixed with correct database enum values)
// ===========================================
import { DealStage } from './types';

// Your database enum values: interested, contacted, demo, proposal, negotiation, won, lost
export const DEAL_STAGES: DealStage[] = [
  'interested',
  'contacted',
  'demo',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

export const STAGE_CONFIG = {
  interested: {
    label: 'Interested',
    color:
      'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30',
    icon: 'eye',
    probability: 15,
    progression: 15,
    dbValue: 'interested',
  },
  contacted: {
    label: 'Contacted',
    color:
      'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30',
    icon: 'users',
    probability: 35,
    progression: 35,
    dbValue: 'contacted',
  },
  demo: {
    label: 'Demo',
    color:
      'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30',
    icon: 'message-square',
    probability: 55,
    progression: 55,
    dbValue: 'demo',
  },
  proposal: {
    label: 'Proposal',
    color:
      'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30',
    icon: 'dollar-sign',
    probability: 75,
    progression: 75,
    dbValue: 'proposal',
  },
  negotiation: {
    label: 'Negotiation',
    color:
      'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30',
    icon: 'handshake',
    probability: 85,
    progression: 85,
    dbValue: 'negotiation',
  },
  won: {
    label: 'Closed Won',
    color:
      'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30',
    icon: 'check-circle-2',
    probability: 100,
    progression: 100,
    dbValue: 'won',
  },
  lost: {
    label: 'Closed Lost',
    color: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30',
    icon: 'x-circle',
    probability: 0,
    progression: 0,
    dbValue: 'lost',
  },
} as const;

// Since your database values match the UI stages exactly, this mapping is 1:1
export const DB_STAGE_TO_UI: Record<string, DealStage> = {
  interested: 'interested',
  contacted: 'contacted',
  demo: 'demo',
  proposal: 'proposal',
  negotiation: 'negotiation',
  won: 'won',
  lost: 'lost',
};

// UI to DB mapping (reverse of above)
export const UI_STAGE_TO_DB: Record<DealStage, string> = {
  interested: 'interested',
  contacted: 'contacted',
  demo: 'demo',
  proposal: 'proposal',
  negotiation: 'negotiation',
  won: 'won',
  lost: 'lost',
};

// Column width for proper kanban display
export const COLUMN_WIDTH = 320; // px
export const COLUMN_GAP = 16; // px
export const MIN_VIEWPORT_WIDTH =
  DEAL_STAGES.length * (COLUMN_WIDTH + COLUMN_GAP);

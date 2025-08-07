// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

'use server';

import { revalidatePath } from 'next/cache';

import {
  createDeal,
  deleteDeal,
  updateDeal,
  updateDealStage,
} from '../server/deals.service';
import { DealStage } from '../types';

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

// ===========================================
// dealflow/_lib/actions/deals.actions.ts (Server Actions for client-side updates)
// ===========================================

export async function updateDealStageAction(
  dealId: string,
  newStage: DealStage,
  accountId: string,
) {
  try {
    const updatedDeal = await updateDealStage(dealId, newStage);

    if (!updatedDeal) {
      return { success: false, error: 'Failed to update deal stage' };
    }

    // Revalidate the dealflow page to refresh the data
    revalidatePath(`/home/${accountId}/dealflow`);

    return { success: true, deal: updatedDeal };
  } catch (error) {
    console.error('Error in updateDealStageAction:', error);
    return { success: false, error: 'Failed to update deal stage' };
  }
}

export async function createDealAction(
  accountId: string,
  dealData: any,
  accountName?: string,
) {
  try {
    console.log('🔄 Creating deal with data:', {
      companyName: dealData.companyName,
      contactName: dealData.contact?.name,
      contactEmail: dealData.contact?.email,
      valueAmount: dealData.valueAmount,
      stage: dealData.stage,
    });

    console.log('🔄 Account Name:--------------', accountName);

    const newDeal = await createDeal(accountId, dealData);

    // Revalidate the dealflow page to refresh the data
    revalidatePath(`/home/${accountName}/dealflow`);
    revalidatePath(`/home/${accountName}/dealflow?view=traditional`);

    console.log('✅ Deal created successfully:', newDeal.id);

    return { success: true, deal: newDeal };
  } catch (error) {
    console.error('❌ Error in createDealAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create deal',
    };
  }
}

export async function updateDealAction(
  dealId: string,
  dealData: any,
  accountId: string,
) {
  try {
    const updatedDeal = await updateDeal(dealId, dealData);

    if (!updatedDeal) {
      return { success: false, error: 'Failed to update deal' };
    }

    // Revalidate the dealflow page to refresh the data
    revalidatePath(`/home/${accountId}/dealflow`);
    revalidatePath(`/home/${accountId}/dealflow/${dealId}`);

    return { success: true, deal: updatedDeal };
  } catch (error) {
    console.error('Error in updateDealAction:', error);
    return { success: false, error: 'Failed to update deal' };
  }
}

export async function deleteDealAction(dealId: string, accountName: string) {
  try {
    console.log('🗑️ Starting server delete for deal:', dealId);

    const success = await deleteDeal(dealId);

    if (!success) {
      console.error('❌ Delete operation returned false');
      return {
        success: false,
        error: 'Failed to delete deal from database',
        needsRevert: true, // Flag to indicate UI should revert optimistic update
      };
    }

    console.log('✅ Deal deleted successfully from database');

    // Revalidate all relevant paths to sync server state
    // Note: These happen in background, UI already updated optimistically
    revalidatePath(`/home/${accountName}/dealflow`);
    revalidatePath(`/home/${accountName}/dealflow?view=traditional`);
    revalidatePath(`/home/${accountName}/dealflow?view=momentum`);
    revalidatePath(`/team/${accountName}`);

    return { success: true };
  } catch (error) {
    console.error('❌ Error in deleteDealAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete deal',
      needsRevert: true, // Flag to indicate UI should revert optimistic update
    };
  }
}

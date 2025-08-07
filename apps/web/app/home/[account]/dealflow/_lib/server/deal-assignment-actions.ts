'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Schema for assigning a deal to a user
const AssignDealSchema = z.object({
  dealId: z.string().uuid('Invalid deal ID'),
  assignedTo: z.string().uuid('Invalid user ID').nullable(),
  accountSlug: z.string().min(1, 'Account slug is required'),
});

// Schema for transferring a deal between users
const TransferDealSchema = z.object({
  dealId: z.string().uuid('Invalid deal ID'),
  fromUserId: z.string().uuid('Invalid source user ID').nullable(),
  toUserId: z.string().uuid('Invalid target user ID'),
  accountSlug: z.string().min(1, 'Account slug is required'),
});

// Schema for getting team members for assignment
const GetTeamMembersSchema = z.object({
  accountSlug: z.string().min(1, 'Account slug is required'),
});

/**
 * @name assignDealAction
 * @description Assigns a deal to a specific team member
 */
export const assignDealAction = enhanceAction(
  async (data, user) => {
    const logger = await getLogger();
    const supabase = getSupabaseServerClient();

    const ctx = {
      name: 'deals.assign',
      userId: user.id,
      dealId: data.dealId,
      assignedTo: data.assignedTo,
      accountSlug: data.accountSlug,
    };

    logger.info(ctx, 'Processing deal assignment...');

    try {
      // Get account ID from slug
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('slug', data.accountSlug)
        .single();

      if (accountError || !account) {
        logger.error({ ...ctx, error: accountError }, 'Account not found');
        throw new Error('Account not found');
      }

      const accountId = account.id;

      // Verify the deal exists and belongs to this account
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id, company_name, account_id')
        .eq('id', data.dealId)
        .eq('account_id', accountId)
        .single();

      if (dealError || !deal) {
        logger.error({ ...ctx, error: dealError }, 'Deal not found or access denied');
        throw new Error('Deal not found or access denied');
      }

      // If assigning to someone (not unassigning), verify the target user is a team member
      if (data.assignedTo) {
        const { data: membership, error: membershipError } = await supabase
          .from('accounts_memberships')
          .select('user_id')
          .eq('account_id', accountId)
          .eq('user_id', data.assignedTo)
          .single();

        if (membershipError || !membership) {
          logger.error({ ...ctx, error: membershipError }, 'Cannot assign deal to target user');
          throw new Error('Cannot assign deal to the specified user - not a team member');
        }
      }

      // Update the deal assignment
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          assigned_to: data.assignedTo,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', data.dealId)
        .eq('account_id', accountId);

      if (updateError) {
        logger.error({ ...ctx, error: updateError }, 'Failed to update deal assignment');
        throw new Error('Failed to update deal assignment');
      }

      logger.info(ctx, 'Deal assignment updated successfully');

      // Revalidate the deals page
      revalidatePath(`/home/${data.accountSlug}/dealflow`);

      return {
        success: true,
        message: data.assignedTo ? 'Deal assigned successfully' : 'Deal unassigned successfully',
      };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Deal assignment failed');
      throw error;
    }
  },
  {
    schema: AssignDealSchema,
  }
);

/**
 * @name transferDealAction
 * @description Transfers a deal from one team member to another
 */
export const transferDealAction = enhanceAction(
  async (data, user) => {
    const logger = await getLogger();
    const supabase = getSupabaseServerClient();

    const ctx = {
      name: 'deals.transfer',
      userId: user.id,
      dealId: data.dealId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      accountSlug: data.accountSlug,
    };

    logger.info(ctx, 'Processing deal transfer...');

    try {
      // Get account ID from slug
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('slug', data.accountSlug)
        .single();

      if (accountError || !account) {
        logger.error({ ...ctx, error: accountError }, 'Account not found');
        throw new Error('Account not found');
      }

      const accountId = account.id;

      // Verify the deal exists and belongs to this account
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id, company_name, account_id')
        .eq('id', data.dealId)
        .eq('account_id', accountId)
        .single();

      if (dealError || !deal) {
        logger.error({ ...ctx, error: dealError }, 'Deal not found or access denied');
        throw new Error('Deal not found or access denied');
      }

      // Note: Will verify assignment after schema migration

      // Verify the target user is a team member
      const { data: membership, error: membershipError } = await supabase
        .from('accounts_memberships')
        .select('user_id')
        .eq('account_id', accountId)
        .eq('user_id', data.toUserId)
        .single();

      if (membershipError || !membership) {
        logger.error({ ...ctx, error: membershipError }, 'Cannot transfer deal to target user');
        throw new Error('Cannot transfer deal to the specified user - not a team member');
      }

      // Update the deal assignment
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          assigned_to: data.toUserId,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', data.dealId)
        .eq('account_id', accountId);

      if (updateError) {
        logger.error({ ...ctx, error: updateError }, 'Failed to transfer deal');
        throw new Error('Failed to transfer deal');
      }

      logger.info(ctx, 'Deal transferred successfully');

      // Revalidate the deals page
      revalidatePath(`/home/${data.accountSlug}/dealflow`);

      return {
        success: true,
        message: 'Deal transferred successfully',
      };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Deal transfer failed');
      throw error;
    }
  },
  {
    schema: TransferDealSchema,
  }
);

/**
 * @name getTeamMembersForAssignmentAction
 * @description Gets list of team members who can be assigned deals
 */
export const getTeamMembersForAssignmentAction = enhanceAction(
  async (data, user) => {
    const logger = await getLogger();
    const supabase = getSupabaseServerClient();

    const ctx = {
      name: 'deals.getTeamMembers',
      userId: user.id,
      accountSlug: data.accountSlug,
    };

    logger.info(ctx, 'Getting team members for assignment...');

    try {
      // Get account ID from slug
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('slug', data.accountSlug)
        .single();

      if (accountError || !account) {
        logger.error({ ...ctx, error: accountError }, 'Account not found');
        throw new Error('Account not found');
      }

      // Get team members directly from memberships and accounts
      const { data: members, error: membersError } = await supabase
        .from('accounts_memberships')
        .select(`
          user_id,
          account_role,
          accounts!inner(id, email, name)
        `)
        .eq('account_id', account.id);

      if (membersError) {
        logger.error({ ...ctx, error: membersError }, 'Failed to get team members');
        throw new Error('Failed to get team members');
      }

      // Transform the data to match expected format
      const transformedMembers = (members || []).map((member: any) => ({
        user_id: member.user_id,
        email: member.accounts.email,
        name: member.accounts.name,
        account_role: member.account_role,
      }));

      logger.info({ ...ctx, memberCount: transformedMembers.length }, 'Team members retrieved successfully');

      return {
        success: true,
        members: transformedMembers,
      };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to get team members');
      throw error;
    }
  },
  {
    schema: GetTeamMembersSchema,
  }
); 
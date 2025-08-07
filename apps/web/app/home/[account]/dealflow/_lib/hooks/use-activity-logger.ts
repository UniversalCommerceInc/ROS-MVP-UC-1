// ===========================================
// hooks/use-activity-logger.ts
// ===========================================
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

// ===========================================
// Types
// ===========================================

interface CreateActivityParams {
  dealId: string;
  activityType:
    | 'meeting'
    | 'ai_assistant'
    | 'email'
    | 'call'
    | 'note'
    | 'task'
    | 'file';
  title: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  createdBy?: string;
}

// ===========================================
// Activity Logger Hook
// ===========================================

export function useActivityLogger() {
  const supabase = getSupabaseBrowserClient();

  const logActivity = async (params: CreateActivityParams) => {
    try {
      const { data, error } = await supabase
        .from('deal_activities')
        .insert({
          deal_id: params.dealId,
          activity_type: params.activityType,
          title: params.title,
          description: params.description || null,
          completed: params.completed || false,
          due_date: params.dueDate || null,
          created_by: params.createdBy || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging activity:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Activity logged successfully:', data);
      return { success: true, data };
    } catch (err) {
      console.error('Error logging activity:', err);
      return { success: false, error: 'Failed to log activity' };
    }
  };

  const logMeeting = async (
    dealId: string,
    title: string,
    description?: string,
  ) => {
    return logActivity({
      dealId,
      activityType: 'meeting',
      title,
      description,
    });
  };

  const logAIAssistant = async (
    dealId: string,
    title: string,
    description?: string,
  ) => {
    return logActivity({
      dealId,
      activityType: 'ai_assistant',
      title,
      description,
    });
  };

  const logEmail = async (
    dealId: string,
    title: string,
    description?: string,
  ) => {
    return logActivity({
      dealId,
      activityType: 'email',
      title,
      description,
    });
  };

  const logCall = async (
    dealId: string,
    title: string,
    description?: string,
  ) => {
    return logActivity({
      dealId,
      activityType: 'call',
      title,
      description,
    });
  };

  const markCompleted = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('deal_activities')
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq('id', activityId);

      if (error) {
        console.error('Error marking activity as completed:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Error marking activity as completed:', err);
      return { success: false, error: 'Failed to mark activity as completed' };
    }
  };

  return {
    logActivity,
    logMeeting,
    logAIAssistant,
    logEmail,
    logCall,
    markCompleted,
  };
}

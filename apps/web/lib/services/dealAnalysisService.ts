// lib/services/dealAnalysisService.ts

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface DealAnalysisOptions {
  includeCompanyAnalysis?: boolean;
  includeEmailAnalysis?: boolean;
  includeMeetingAnalysis?: boolean;
  includeMomentumUpdate?: boolean;
  trigger?: 'creation' | 'import' | 'update' | 'manual';
}

export interface CompanyInfo {
  name: string;
  summary: string;
  website?: string;
  industry?: string;
}

export class DealAnalysisService {
  /**
   * Comprehensive deal analysis that gets triggered on deal creation, updates, and imports
   */
  static async analyzeDeal(
    dealId: string,
    accountId: string,
    options: DealAnalysisOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`🔍 Starting comprehensive analysis for deal: ${dealId}`);
    console.log(`📊 Analysis options:`, options);

    try {
      const supabase = getSupabaseServerClient();
      
      // Get deal data
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .eq('account_id', accountId)
        .single();

      if (dealError || !deal) {
        console.error('❌ Deal not found:', dealError);
        return { success: false, error: 'Deal not found' };
      }

      console.log(`📈 Analyzing deal: ${deal.company_name} (${deal.stage})`);

      const analysisPromises: Promise<any>[] = [];

      // 1. Company Analysis (if needed)
      if (options.includeCompanyAnalysis !== false) {
        analysisPromises.push(this.analyzeCompanyInfo(deal, supabase));
      }

      // 2. Email Analysis
      if (options.includeEmailAnalysis !== false) {
        analysisPromises.push(this.analyzeEmailContext(dealId, accountId, supabase));
      }

      // 3. Meeting Analysis
      if (options.includeMeetingAnalysis !== false) {
        analysisPromises.push(this.analyzeMeetingContext(dealId, accountId, supabase));
      }

      // 4. Momentum Analysis
      if (options.includeMomentumUpdate !== false) {
        analysisPromises.push(this.updateMomentumScore(dealId, deal, supabase));
      }

      // Execute all analyses in parallel
      const results = await Promise.allSettled(analysisPromises);
      
      // Log results
      results.forEach((result, index) => {
        const analysisType = ['Company', 'Email', 'Meeting', 'Momentum'][index];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${analysisType} analysis completed`);
        } else {
          console.error(`❌ ${analysisType} analysis failed:`, result.reason);
        }
      });

      // Update the last analysis timestamp
      await supabase
        .from('deals')
        .update({ 
          last_analysis_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId);

      console.log(`🎉 Comprehensive analysis completed for deal: ${deal.company_name}`);
      return { success: true };

    } catch (error) {
      console.error('💥 Deal analysis failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Extract company name from email domain
   */
  static extractCompanyFromEmail(email: string): string | null {
    if (!email || typeof email !== 'string') return null;
    
    const domain = email.split('@')[1];
    if (!domain) return null;
    
    // Skip common email providers
    const commonDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
      'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
    ];
    
    if (commonDomains.includes(domain.toLowerCase())) return null;
    
    // Convert domain to potential company name
    const companyName = domain.split('.')[0]
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return companyName;
  }

  /**
   * Extract domain from email for website analysis
   */
  static extractDomainFromEmail(email: string): string | null {
    if (!email || typeof email !== 'string') return null;
    
    const domain = email.split('@')[1];
    if (!domain) return null;
    
    // Skip common email providers
    const commonDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
      'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
    ];
    
    if (commonDomains.includes(domain.toLowerCase())) return null;
    
    return `https://${domain}`;
  }

  /**
   * Company analysis using AI
   */
  private static async analyzeCompanyInfo(deal: any, supabase: any): Promise<void> {
    // Skip if we already have a good company description
    if (deal.company_description && deal.company_description.length > 50) {
      console.log('⏭️ Company description already exists, skipping analysis');
      return;
    }

    let websiteUrl = deal.website;
    
    // Try to extract domain from email if no website
    if (!websiteUrl && deal.primary_email) {
      websiteUrl = this.extractDomainFromEmail(deal.primary_email);
      console.log('📧 Extracted domain from email:', websiteUrl);
    }

    if (!websiteUrl) {
      console.log('⚠️ No website/domain available for company analysis');
      return;
    }

    try {
      // Import CompanyInfoService dynamically
      const { CompanyInfoService } = await import('./companyInfoService');
      
      const companyInfo = await CompanyInfoService.fetchCompanyInfo(websiteUrl);
      
      if (companyInfo && companyInfo.summary) {
        await supabase
          .from('deals')
          .update({ 
            company_description: companyInfo.summary,
            website: websiteUrl // Update website if it was extracted
          })
          .eq('id', deal.id);

        console.log('✅ Updated deal with AI-generated company description');
      }
    } catch (error) {
      console.error('❌ Company analysis failed:', error);
    }
  }

  /**
   * Analyze email context for the deal
   */
  private static async analyzeEmailContext(dealId: string, accountId: string, supabase: any): Promise<void> {
    try {
      console.log('📧 Analyzing email context for deal...');
      
      // Fetch recent emails related to deal
      const { data: emails } = await supabase
        .from('emails')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!emails || emails.length === 0) {
        console.log('📧 No emails found for email context analysis');
        return;
      }

      // Extract key insights from email threads
      const emailInsights = {
        recentActivityCount: emails.length,
        lastEmailDate: emails[0]?.created_at,
        hasRecentActivity: emails.some(email => {
          const emailDate = new Date(email.created_at);
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return emailDate > threeDaysAgo;
        })
      };

      // Update deal with email insights
      await supabase
        .from('deals')
        .update({
          email_insights: emailInsights,
          last_email_activity: emails[0]?.created_at
        })
        .eq('id', dealId);

      console.log('✅ Email context analysis completed');
      
    } catch (error) {
      console.error('❌ Email context analysis failed:', error);
    }
  }

  /**
   * Analyze meeting context and transcripts
   */
  private static async analyzeMeetingContext(dealId: string, accountId: string, supabase: any): Promise<void> {
    try {
      // Get recent meetings for this deal
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .eq('deal_id', dealId)
        .eq('account_id', accountId)
        .order('timestamp_start_utc', { ascending: false })
        .limit(5);

      if (!meetings || meetings.length === 0) {
        console.log('📅 No meetings found for deal');
        return;
      }

      console.log(`📅 Found ${meetings.length} meetings for analysis`);
      
      // Analyze meeting patterns and insights
      const meetingInsights = {
        recentMeetingCount: meetings.length,
        lastMeetingDate: meetings[0]?.timestamp_start_utc,
        hasRecentMeetings: meetings.some(meeting => {
          const meetingDate = new Date(meeting.timestamp_start_utc);
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return meetingDate > oneWeekAgo;
        }),
        totalMeetingDuration: meetings.reduce((total, meeting) => {
          return total + (meeting.duration_minutes || 0);
        }, 0),
        averageMeetingLength: meetings.length > 0 ? 
          meetings.reduce((total, meeting) => total + (meeting.duration_minutes || 0), 0) / meetings.length 
          : 0
      };

      // Update deal with meeting insights
      await supabase
        .from('deals')
        .update({
          meeting_insights: meetingInsights,
          last_meeting_activity: meetings[0]?.timestamp_start_utc
        })
        .eq('id', dealId);

      console.log('✅ Meeting context analysis completed');
      
    } catch (error) {
      console.error('❌ Meeting context analysis failed:', error);
    }
  }

  /**
   * Update momentum score based on recent activity
   */
  private static async updateMomentumScore(dealId: string, deal: any, supabase: any): Promise<void> {
    try {
      console.log('📈 Updating momentum score');
      
      // Simple momentum calculation based on:
      // - Recent activity (meetings, emails, updates)
      // - Stage progression
      // - Time in current stage
      // - Response times
      
      let momentumScore = deal.momentum || 50;
      let momentumTrend = deal.momentum_trend || 'steady';
      
      // Get recent activity count
      const { data: recentActivity } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('deal_id', dealId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      const activityCount = recentActivity?.length || 0;
      
      // Adjust momentum based on activity
      if (activityCount >= 3) {
        momentumScore = Math.min(momentumScore + 10, 100);
        momentumTrend = 'increasing';
      } else if (activityCount === 0) {
        momentumScore = Math.max(momentumScore - 15, 0);
        momentumTrend = 'decreasing';
      }

      await supabase
        .from('deals')
        .update({
          momentum: momentumScore,
          momentum_trend: momentumTrend,
          last_momentum_change: new Date().toISOString()
        })
        .eq('id', dealId);

      console.log(`✅ Updated momentum: ${momentumScore} (${momentumTrend})`);
      
    } catch (error) {
      console.error('❌ Momentum update failed:', error);
    }
  }

  /**
   * Get enhanced company name from contact info
   */
  static getEnhancedCompanyName(dealData: any): string {
    // Priority order for company name
    const sources = [
      dealData.dealname,           // HubSpot deal name
      dealData.name,               // Salesforce deal name  
      dealData.title,              // Pipedrive deal title
      dealData.company_name,       // Direct company name
      dealData.contact?.company,   // Contact's company
      dealData.properties?.dealname, // HubSpot properties
      dealData.org_id?.name,       // Pipedrive organization
    ];

    // Try each source
    for (const source of sources) {
      if (source && typeof source === 'string' && source.trim().length > 0) {
        return source.trim();
      }
    }

    // Try extracting from email
    const email = dealData.contact?.email || dealData.primary_email || dealData.email;
    if (email) {
      const extracted = this.extractCompanyFromEmail(email);
      if (extracted) {
        return extracted;
      }
    }

    return 'Unknown Company';
  }
}
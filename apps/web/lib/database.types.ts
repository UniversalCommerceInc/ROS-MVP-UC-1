export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_personal_account: boolean
          name: string
          picture_url: string | null
          primary_owner_user_id: string
          public_data: Json
          slug: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_personal_account?: boolean
          name: string
          picture_url?: string | null
          primary_owner_user_id?: string
          public_data?: Json
          slug?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_personal_account?: boolean
          name?: string
          picture_url?: string | null
          primary_owner_user_id?: string
          public_data?: Json
          slug?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      accounts_memberships: {
        Row: {
          account_id: string
          account_role: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_role: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_role?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_account_role_fkey"
            columns: ["account_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      activities: {
        Row: {
          completed: boolean
          created_at: string
          created_by: string | null
          deal_id: string
          description: string | null
          due_date: string | null
          id: string
          title: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by?: string | null
          deal_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by?: string | null
          deal_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          meeting_id: string
          model_used: string | null
          processing_time_seconds: number | null
          progress_percentage: number | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          meeting_id: string
          model_used?: string | null
          processing_time_seconds?: number | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          meeting_id?: string
          model_used?: string | null
          processing_time_seconds?: number | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          account_id: string
          customer_id: string
          email: string | null
          id: number
          provider: Database["public"]["Enums"]["billing_provider"]
        }
        Insert: {
          account_id: string
          customer_id: string
          email?: string | null
          id?: number
          provider: Database["public"]["Enums"]["billing_provider"]
        }
        Update: {
          account_id?: string
          customer_id?: string
          email?: string | null
          id?: number
          provider?: Database["public"]["Enums"]["billing_provider"]
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          account_id: string
          attendees: Json | null
          calendar_event_id: string
          calendar_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          location: string | null
          meeting_link: string | null
          organizer_email: string | null
          organizer_name: string | null
          raw_event_data: Json | null
          source: string | null
          start_time: string
          status: string | null
          timezone: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          visibility: string | null
        }
        Insert: {
          account_id: string
          attendees?: Json | null
          calendar_event_id: string
          calendar_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          raw_event_data?: Json | null
          source?: string | null
          start_time: string
          status?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility?: string | null
        }
        Update: {
          account_id?: string
          attendees?: Json | null
          calendar_event_id?: string
          calendar_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          raw_event_data?: Json | null
          source?: string | null
          start_time?: string
          status?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          enable_account_billing: boolean
          enable_team_account_billing: boolean
          enable_team_accounts: boolean
        }
        Insert: {
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          enable_account_billing?: boolean
          enable_team_account_billing?: boolean
          enable_team_accounts?: boolean
        }
        Update: {
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          enable_account_billing?: boolean
          enable_team_account_billing?: boolean
          enable_team_accounts?: boolean
        }
        Relationships: []
      }
      contacts: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_decision_maker: boolean
          last_contacted: string | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_decision_maker?: boolean
          last_contacted?: string | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_decision_maker?: boolean
          last_contacted?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          completed: boolean
          created_at: string
          created_by: string | null
          deal_id: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          completed?: boolean
          created_at?: string
          created_by?: string | null
          deal_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          completed?: boolean
          created_at?: string
          created_by?: string | null
          deal_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_contacts: {
        Row: {
          contact_id: string | null
          contact_role_type:
            | Database["public"]["Enums"]["contact_role_type"]
            | null
          created_at: string
          deal_id: string
          email: string
          id: string
          is_decision_maker: boolean
          is_primary: boolean
          last_contacted: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          contact_role_type?:
            | Database["public"]["Enums"]["contact_role_type"]
            | null
          created_at?: string
          deal_id: string
          email: string
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          last_contacted?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          contact_role_type?:
            | Database["public"]["Enums"]["contact_role_type"]
            | null
          created_at?: string
          deal_id?: string
          email?: string
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          last_contacted?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_momentum_markers: {
        Row: {
          created_at: string
          deal_id: string
          description: string
          id: string
          impact: Database["public"]["Enums"]["impact"]
          marker_type: Database["public"]["Enums"]["marker_type"]
        }
        Insert: {
          created_at?: string
          deal_id: string
          description: string
          id?: string
          impact: Database["public"]["Enums"]["impact"]
          marker_type: Database["public"]["Enums"]["marker_type"]
        }
        Update: {
          created_at?: string
          deal_id?: string
          description?: string
          id?: string
          impact?: Database["public"]["Enums"]["impact"]
          marker_type?: Database["public"]["Enums"]["marker_type"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_momentum_markers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string
          ai_analysis_raw: string | null
          ai_insights: Json | null
          blockers: string[] | null
          close_date: string | null
          company_name: string
          company_size: string | null
          competitor_mentions: string[] | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deal_title: string | null
          green_flags: string[] | null
          id: string
          industry: string
          last_analysis_date: string | null
          last_meeting_date: string | null
          last_meeting_notes: string | null
          last_meeting_summary: string | null
          last_meeting_type: string | null
          last_momentum_change: string | null
          last_updated: string | null
          meeting_action_items: Json | null
          meeting_highlights: Json | null
          momentum: number
          momentum_trend: Database["public"]["Enums"]["momentum_trend"]
          next_action: string | null
          next_steps: string[] | null
          opportunities: string[] | null
          organizational_context: string[] | null
          pain_points: string[] | null
          primary_contact: string
          primary_email: string
          probability: number | null
          red_flags: string[] | null
          relationship_insights: string | null
          sentiment_engagement: string[] | null
          source: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          tags: string[] | null
          total_meetings: number | null
          updated_at: string
          updated_by: string | null
          value_amount: number
          value_currency: string
          website: string | null
        }
        Insert: {
          account_id: string
          ai_analysis_raw?: string | null
          ai_insights?: Json | null
          blockers?: string[] | null
          close_date?: string | null
          company_name: string
          company_size?: string | null
          competitor_mentions?: string[] | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deal_title?: string | null
          green_flags?: string[] | null
          id?: string
          industry: string
          last_analysis_date?: string | null
          last_meeting_date?: string | null
          last_meeting_notes?: string | null
          last_meeting_summary?: string | null
          last_meeting_type?: string | null
          last_momentum_change?: string | null
          last_updated?: string | null
          meeting_action_items?: Json | null
          meeting_highlights?: Json | null
          momentum?: number
          momentum_trend?: Database["public"]["Enums"]["momentum_trend"]
          next_action?: string | null
          next_steps?: string[] | null
          opportunities?: string[] | null
          organizational_context?: string[] | null
          pain_points?: string[] | null
          primary_contact?: string
          primary_email?: string
          probability?: number | null
          red_flags?: string[] | null
          relationship_insights?: string | null
          sentiment_engagement?: string[] | null
          source?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tags?: string[] | null
          total_meetings?: number | null
          updated_at?: string
          updated_by?: string | null
          value_amount?: number
          value_currency?: string
          website?: string | null
        }
        Update: {
          account_id?: string
          ai_analysis_raw?: string | null
          ai_insights?: Json | null
          blockers?: string[] | null
          close_date?: string | null
          company_name?: string
          company_size?: string | null
          competitor_mentions?: string[] | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deal_title?: string | null
          green_flags?: string[] | null
          id?: string
          industry?: string
          last_analysis_date?: string | null
          last_meeting_date?: string | null
          last_meeting_notes?: string | null
          last_meeting_summary?: string | null
          last_meeting_type?: string | null
          last_momentum_change?: string | null
          last_updated?: string | null
          meeting_action_items?: Json | null
          meeting_highlights?: Json | null
          momentum?: number
          momentum_trend?: Database["public"]["Enums"]["momentum_trend"]
          next_action?: string | null
          next_steps?: string[] | null
          opportunities?: string[] | null
          organizational_context?: string[] | null
          pain_points?: string[] | null
          primary_contact?: string
          primary_email?: string
          probability?: number | null
          red_flags?: string[] | null
          relationship_insights?: string | null
          sentiment_engagement?: string[] | null
          source?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tags?: string[] | null
          total_meetings?: number | null
          updated_at?: string
          updated_by?: string | null
          value_amount?: number
          value_currency?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_status: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          email: string
          emails_synced: number
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          emails_synced?: number
          error_message?: string | null
          id?: string
          started_at?: string | null
          status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          emails_synced?: number
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_status_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sync_status_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sync_status_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          account_id: string
          attachment_data: string | null
          bcc_email: string[] | null
          body_html: string | null
          body_text: string | null
          cc_email: string[] | null
          created_at: string
          created_by: string | null
          from_email: string
          from_name: string | null
          gmail_id: string
          has_attachments: boolean
          id: string
          is_read: boolean
          is_starred: boolean
          labels: string[] | null
          received_at: string
          subject: string | null
          thread_id: string
          to_email: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          attachment_data?: string | null
          bcc_email?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_email?: string[] | null
          created_at?: string
          created_by?: string | null
          from_email: string
          from_name?: string | null
          gmail_id: string
          has_attachments?: boolean
          id?: string
          is_read?: boolean
          is_starred?: boolean
          labels?: string[] | null
          received_at: string
          subject?: string | null
          thread_id: string
          to_email?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          attachment_data?: string | null
          bcc_email?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_email?: string[] | null
          created_at?: string
          created_by?: string | null
          from_email?: string
          from_name?: string | null
          gmail_id?: string
          has_attachments?: boolean
          id?: string
          is_read?: boolean
          is_starred?: boolean
          labels?: string[] | null
          received_at?: string
          subject?: string | null
          thread_id?: string
          to_email?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emails_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      folk_tokens: {
        Row: {
          account_id: string
          api_domain: string
          api_key: string
          created_at: string
          email_address: string | null
          id: string
          scope: string | null
          updated_at: string
          user_id: string
          user_info: Json | null
        }
        Insert: {
          account_id: string
          api_domain?: string
          api_key: string
          created_at?: string
          email_address?: string | null
          id?: string
          scope?: string | null
          updated_at?: string
          user_id: string
          user_info?: Json | null
        }
        Update: {
          account_id?: string
          api_domain?: string
          api_key?: string
          created_at?: string
          email_address?: string | null
          id?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
          user_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "folk_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folk_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folk_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_tokens: {
        Row: {
          access_token: string
          account_id: string
          created_at: string
          email_address: string
          expires_at: string
          id: string
          is_active: boolean | null
          last_sync: string | null
          refresh_token: string
          scope: string
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_id: string
          created_at?: string
          email_address: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token: string
          scope?: string
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_id?: string
          created_at?: string
          email_address?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token?: string
          scope?: string
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          account_id: string
          created_at: string
          highlight: string | null
          id: number
          meeting_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          highlight?: string | null
          id?: number
          meeting_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          highlight?: string | null
          id?: number
          meeting_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_tokens: {
        Row: {
          access_token: string
          account_id: string
          api_domain: string
          created_at: string
          email_address: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
          user_info: Json | null
        }
        Insert: {
          access_token: string
          account_id: string
          api_domain: string
          created_at?: string
          email_address?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
          user_info?: Json | null
        }
        Update: {
          access_token?: string
          account_id?: string
          api_domain?: string
          created_at?: string
          email_address?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
          user_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hubspot_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hubspot_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          account_id: string
          created_at: string
          email: string
          expires_at: string
          id: number
          invite_token: string
          invited_by: string
          role: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: number
          invite_token: string
          invited_by: string
          role: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: number
          invite_token?: string
          invited_by?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      meetings: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          duration: number | null
          end_time: string | null
          host_email: string | null
          id: string
          language: string | null
          meeting_id: string | null
          participant_emails: string[] | null
          recording_url: string | null
          source: string | null
          start_time: string | null
          timestamp_end_utc: string | null
          timestamp_start_utc: string | null
          timezone: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          duration?: number | null
          end_time?: string | null
          host_email?: string | null
          id?: string
          language?: string | null
          meeting_id?: string | null
          participant_emails?: string[] | null
          recording_url?: string | null
          source?: string | null
          start_time?: string | null
          timestamp_end_utc?: string | null
          timestamp_start_utc?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          duration?: number | null
          end_time?: string | null
          host_email?: string | null
          id?: string
          language?: string | null
          meeting_id?: string | null
          participant_emails?: string[] | null
          recording_url?: string | null
          source?: string | null
          start_time?: string | null
          timestamp_end_utc?: string | null
          timestamp_start_utc?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      microsoft_tokens: {
        Row: {
          access_token: string
          account_id: string
          created_at: string
          email_address: string
          expires_at: string
          id: string
          is_active: boolean | null
          last_sync: string | null
          refresh_token: string
          scope: string
          sync_status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_id: string
          created_at?: string
          email_address: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token: string
          scope?: string
          sync_status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_id?: string
          created_at?: string
          email_address?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token?: string
          scope?: string
          sync_status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "microsoft_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      nonces: {
        Row: {
          client_token: string
          created_at: string
          expires_at: string
          id: string
          last_verification_at: string | null
          last_verification_ip: unknown | null
          last_verification_user_agent: string | null
          metadata: Json | null
          nonce: string
          purpose: string
          revoked: boolean
          revoked_reason: string | null
          scopes: string[] | null
          used_at: string | null
          user_id: string | null
          verification_attempts: number
        }
        Insert: {
          client_token: string
          created_at?: string
          expires_at: string
          id?: string
          last_verification_at?: string | null
          last_verification_ip?: unknown | null
          last_verification_user_agent?: string | null
          metadata?: Json | null
          nonce: string
          purpose: string
          revoked?: boolean
          revoked_reason?: string | null
          scopes?: string[] | null
          used_at?: string | null
          user_id?: string | null
          verification_attempts?: number
        }
        Update: {
          client_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_verification_at?: string | null
          last_verification_ip?: unknown | null
          last_verification_user_agent?: string | null
          metadata?: Json | null
          nonce?: string
          purpose?: string
          revoked?: boolean
          revoked_reason?: string | null
          scopes?: string[] | null
          used_at?: string | null
          user_id?: string | null
          verification_attempts?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          account_id: string
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          dismissed: boolean
          expires_at: string | null
          id: number
          link: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          account_id: string
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dismissed?: boolean
          expires_at?: string | null
          id?: never
          link?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          account_id?: string
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dismissed?: boolean
          expires_at?: string | null
          id?: never
          link?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_amount: number | null
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id: string
          order_id: string
          price_amount?: number | null
          product_id: string
          quantity?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_amount?: number | null
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_id: string
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          created_at: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id: string
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          created_at?: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          billing_customer_id?: number
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          created_at?: string
          currency?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_billing_customer_id_fkey"
            columns: ["billing_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pipedrive_tokens: {
        Row: {
          access_token: string
          account_id: string
          api_domain: string
          created_at: string
          email_address: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
          user_info: Json | null
        }
        Insert: {
          access_token: string
          account_id: string
          api_domain: string
          created_at?: string
          email_address?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
          user_info?: Json | null
        }
        Update: {
          access_token?: string
          account_id?: string
          api_domain?: string
          created_at?: string
          email_address?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
          user_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pipedrive_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipedrive_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipedrive_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permissions"]
          role: string
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permissions"]
          role: string
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permissions"]
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      roles: {
        Row: {
          hierarchy_level: number
          name: string
        }
        Insert: {
          hierarchy_level: number
          name: string
        }
        Update: {
          hierarchy_level?: number
          name?: string
        }
        Relationships: []
      }
      salesforce_tokens: {
        Row: {
          access_token: string
          account_id: string
          api_domain: string
          created_at: string
          email_address: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
          user_info: Json | null
        }
        Insert: {
          access_token: string
          account_id: string
          api_domain: string
          created_at?: string
          email_address?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
          user_info?: Json | null
        }
        Update: {
          access_token?: string
          account_id?: string
          api_domain?: string
          created_at?: string
          email_address?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
          user_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "salesforce_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salesforce_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salesforce_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_meetings: {
        Row: {
          account_id: string
          attendees: Json | null
          calendar_event_id: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          end_time: string
          id: string
          meetgeek_meeting_id: string | null
          meeting_description: string | null
          meeting_link: string | null
          meeting_title: string
          start_time: string
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          attendees?: Json | null
          calendar_event_id: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_time: string
          id?: string
          meetgeek_meeting_id?: string | null
          meeting_description?: string | null
          meeting_link?: string | null
          meeting_title: string
          start_time: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          attendees?: Json | null
          calendar_event_id?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_time?: string
          id?: string
          meetgeek_meeting_id?: string | null
          meeting_description?: string | null
          meeting_link?: string | null
          meeting_title?: string
          start_time?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_meetings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_tokens: {
        Row: {
          access_token: string
          account_id: string
          app_id: string | null
          authed_user_id: string
          authed_user_token: string | null
          bot_user_id: string | null
          created_at: string
          enterprise_id: string | null
          enterprise_name: string | null
          id: string
          incoming_webhook_channel: string | null
          incoming_webhook_channel_id: string | null
          incoming_webhook_configuration_url: string | null
          scope: string | null
          team_id: string
          team_name: string
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          access_token: string
          account_id: string
          app_id?: string | null
          authed_user_id: string
          authed_user_token?: string | null
          bot_user_id?: string | null
          created_at?: string
          enterprise_id?: string | null
          enterprise_name?: string | null
          id?: string
          incoming_webhook_channel?: string | null
          incoming_webhook_channel_id?: string | null
          incoming_webhook_configuration_url?: string | null
          scope?: string | null
          team_id: string
          team_name: string
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string
          app_id?: string | null
          authed_user_id?: string
          authed_user_token?: string | null
          bot_user_id?: string | null
          created_at?: string
          enterprise_id?: string | null
          enterprise_name?: string | null
          id?: string
          incoming_webhook_channel?: string | null
          incoming_webhook_channel_id?: string | null
          incoming_webhook_configuration_url?: string | null
          scope?: string | null
          team_id?: string
          team_name?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_items: {
        Row: {
          created_at: string
          id: string
          interval: string
          interval_count: number
          price_amount: number | null
          product_id: string
          quantity: number
          subscription_id: string
          type: Database["public"]["Enums"]["subscription_item_type"]
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id: string
          interval: string
          interval_count: number
          price_amount?: number | null
          product_id: string
          quantity?: number
          subscription_id: string
          type: Database["public"]["Enums"]["subscription_item_type"]
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval?: string
          interval_count?: number
          price_amount?: number | null
          product_id?: string
          quantity?: number
          subscription_id?: string
          type?: Database["public"]["Enums"]["subscription_item_type"]
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          active: boolean
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          id: string
          period_ends_at: string
          period_starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          active: boolean
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          created_at?: string
          currency: string
          id: string
          period_ends_at: string
          period_starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          billing_customer_id?: number
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          id?: string
          period_ends_at?: string
          period_starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_billing_customer_id_fkey"
            columns: ["billing_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          account_id: string
          ai_insights: string | null
          created_at: string
          id: string
          meeting_id: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          ai_insights?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          ai_insights?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          id: string
          meeting_id: string | null
          sentence_id: number | null
          speaker: string | null
          timestamp: string | null
          transcript: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          sentence_id?: number | null
          speaker?: string | null
          timestamp?: string | null
          transcript?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          sentence_id?: number | null
          speaker?: string | null
          timestamp?: string | null
          transcript?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      zoho_tokens: {
        Row: {
          access_token: string
          account_id: string
          api_domain: string
          created_at: string
          email_address: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
          user_info: Json | null
        }
        Insert: {
          access_token: string
          account_id: string
          api_domain: string
          created_at?: string
          email_address?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
          user_info?: Json | null
        }
        Update: {
          access_token?: string
          account_id?: string
          api_domain?: string
          created_at?: string
          email_address?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
          user_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "zoho_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoho_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoho_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_account_workspace: {
        Row: {
          id: string | null
          name: string | null
          picture_url: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          id: string | null
          name: string | null
          picture_url: string | null
          role: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_memberships_account_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { user_id: string; token: string }
        Returns: string
      }
      add_invitations_to_account: {
        Args: {
          account_slug: string
          invitations: Database["public"]["CompositeTypes"]["invitation"][]
        }
        Returns: Database["public"]["Tables"]["invitations"]["Row"][]
      }
      can_action_account_member: {
        Args: { target_team_account_id: string; target_user_id: string }
        Returns: boolean
      }
      create_invitation: {
        Args: { role: string; email: string; account_id: string }
        Returns: {
          account_id: string
          created_at: string
          email: string
          expires_at: string
          id: number
          invite_token: string
          invited_by: string
          role: string
          updated_at: string
        }
      }
      create_nonce: {
        Args: {
          p_purpose?: string
          p_expires_in_seconds?: number
          p_metadata?: Json
          p_revoke_previous?: boolean
          p_scopes?: string[]
          p_user_id?: string
        }
        Returns: Json
      }
      create_team_account: {
        Args: { account_name: string }
        Returns: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_personal_account: boolean
          name: string
          picture_url: string | null
          primary_owner_user_id: string
          public_data: Json
          slug: string | null
          updated_at: string | null
          updated_by: string | null
        }
      }
      get_account_invitations: {
        Args: { account_slug: string }
        Returns: {
          expires_at: string
          inviter_name: string
          inviter_email: string
          id: number
          email: string
          account_id: string
          invited_by: string
          role: string
          created_at: string
          updated_at: string
        }[]
      }
      get_account_members: {
        Args: { account_slug: string }
        Returns: {
          role_hierarchy_level: number
          role: string
          id: string
          user_id: string
          account_id: string
          picture_url: string
          email: string
          created_at: string
          updated_at: string
          name: string
          primary_owner_user_id: string
        }[]
      }
      get_config: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_gmail_emails: {
        Args: {
          p_search?: string
          p_account_id: string
          p_limit?: number
          p_offset?: number
          p_labels?: string[]
          p_sort_by?: string
          p_sort_direction?: string
        }
        Returns: {
          id: string
          gmail_message_id: string
          subject: string
          from_email: string
          from_name: string
          to_email: string
          to_name: string
          body_text: string
          is_read: boolean
          is_starred: boolean
          received_at: string
          labels: string[]
        }[]
      }
      get_nonce_status: {
        Args: { p_id: string }
        Returns: Json
      }
      get_upper_system_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_active_subscription: {
        Args: { target_account_id: string }
        Returns: boolean
      }
      has_more_elevated_role: {
        Args: {
          target_user_id: string
          target_account_id: string
          role_name: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          user_id: string
          account_id: string
          permission_name: Database["public"]["Enums"]["app_permissions"]
        }
        Returns: boolean
      }
      has_role_on_account: {
        Args: { account_role?: string; account_id: string }
        Returns: boolean
      }
      has_same_role_hierarchy_level: {
        Args: {
          target_user_id: string
          role_name: string
          target_account_id: string
        }
        Returns: boolean
      }
      is_aal2: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_account_owner: {
        Args: { account_id: string }
        Returns: boolean
      }
      is_account_team_member: {
        Args: { target_account_id: string }
        Returns: boolean
      }
      is_mfa_compliant: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_set: {
        Args: { field_name: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_team_member: {
        Args: { account_id: string; user_id: string }
        Returns: boolean
      }
      revoke_nonce: {
        Args: { p_reason?: string; p_id: string }
        Returns: boolean
      }
      team_account_workspace: {
        Args: { account_slug: string }
        Returns: {
          permissions: Database["public"]["Enums"]["app_permissions"][]
          id: string
          name: string
          picture_url: string
          slug: string
          role: string
          role_hierarchy_level: number
          primary_owner_user_id: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
        }[]
      }
      transfer_team_account_ownership: {
        Args: { new_owner_id: string; target_account_id: string }
        Returns: undefined
      }
      upsert_order: {
        Args: {
          target_customer_id: string
          total_amount: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          status: Database["public"]["Enums"]["payment_status"]
          target_account_id: string
          target_order_id: string
          line_items: Json
          currency: string
        }
        Returns: {
          account_id: string
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          created_at: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at: string
        }
      }
      upsert_subscription: {
        Args: {
          trial_ends_at?: string
          target_account_id: string
          target_customer_id: string
          target_subscription_id: string
          active: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          currency: string
          period_starts_at: string
          period_ends_at: string
          line_items: Json
          trial_starts_at?: string
        }
        Returns: {
          account_id: string
          active: boolean
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          id: string
          period_ends_at: string
          period_starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
      }
      verify_nonce: {
        Args: {
          p_purpose: string
          p_user_agent?: string
          p_max_verification_attempts?: number
          p_required_scopes?: string[]
          p_user_id?: string
          p_ip?: unknown
          p_token: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_permissions:
        | "roles.manage"
        | "billing.manage"
        | "settings.manage"
        | "members.manage"
        | "invites.manage"
      billing_provider: "stripe" | "lemon-squeezy" | "paddle"
      contact_role_type: "technical" | "financial" | "executive" | "other"
      deal_stage:
        | "interested"
        | "contacted"
        | "demo"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      email_provider: "gmail"
      impact: "low" | "medium" | "high"
      marker_type: "positive" | "neutral" | "negative"
      momentum_trend: "up" | "down" | "steady"
      notification_channel: "in_app" | "email"
      notification_type: "info" | "warning" | "error"
      payment_status: "pending" | "succeeded" | "failed"
      subscription_item_type: "flat" | "per_seat" | "metered"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
    }
    CompositeTypes: {
      invitation: {
        email: string | null
        role: string | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { owner: string; metadata: Json; bucketid: string; name: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          next_upload_token?: string
          next_key_token?: string
          max_keys?: number
          delimiter_param: string
          prefix_param: string
          bucket_id: string
        }
        Returns: {
          created_at: string
          key: string
          id: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          next_token?: string
          start_after?: string
          max_keys?: number
          bucket_id: string
          delimiter_param: string
          prefix_param: string
        }
        Returns: {
          name: string
          updated_at: string
          metadata: Json
          id: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          sortcolumn?: string
          search?: string
          offsets?: number
          levels?: number
          limits?: number
          bucketname: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          last_accessed_at: string
          created_at: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          sortorder?: string
          sortcolumn?: string
          search?: string
          offsets?: number
          bucketname: string
          levels?: number
          limits?: number
        }
        Returns: {
          last_accessed_at: string
          created_at: string
          updated_at: string
          id: string
          name: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          updated_at: string
          created_at: string
          id: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_permissions: [
        "roles.manage",
        "billing.manage",
        "settings.manage",
        "members.manage",
        "invites.manage",
      ],
      billing_provider: ["stripe", "lemon-squeezy", "paddle"],
      contact_role_type: ["technical", "financial", "executive", "other"],
      deal_stage: [
        "interested",
        "contacted",
        "demo",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      email_provider: ["gmail"],
      impact: ["low", "medium", "high"],
      marker_type: ["positive", "neutral", "negative"],
      momentum_trend: ["up", "down", "steady"],
      notification_channel: ["in_app", "email"],
      notification_type: ["info", "warning", "error"],
      payment_status: ["pending", "succeeded", "failed"],
      subscription_item_type: ["flat", "per_seat", "metered"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
        "paused",
      ],
    },
  },
  storage: {
    Enums: {},
  },
} as const


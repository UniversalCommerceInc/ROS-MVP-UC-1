// Gmail Auth Types
export interface GmailAuth {
  id: string;
  account_id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  email_address: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

// Gmail Email Types
export interface GmailEmail {
  id: string;
  account_id: string;
  gmail_id: string;
  thread_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string[];
  cc_email: string[] | null;
  bcc_email: string[] | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  labels: string[];
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  attachment_data: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Email Sync Status Types
export interface EmailSyncStatus {
  id: string;
  account_id: string;
  email: string;
  status: 'in_progress' | 'completed' | 'failed';
  emails_synced: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// API Response Types
export interface GmailAccountsResponse {
  success: boolean;
  accounts?: {
    email_address: string;
    expires_at: string;
  }[];
  error?: string;
}

export interface GmailEmailsResponse {
  success: boolean;
  emails?: GmailEmail[];
  total?: number;
  error?: string;
  debug?: {
    message?: string;
    allEmailsInDb?: number;
    tables?: string[];
    dealContactsCount?: number;
    contactEmails?: number;
    matchedEmails?: number;
    accountId?: string;
    [key: string]: any;
  };
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  emailsProcessed?: number;
  error?: string;
}

// Email Sending Types
export interface SendEmailParams {
  accountId: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

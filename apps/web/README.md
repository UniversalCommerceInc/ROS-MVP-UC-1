# 🧩 Supabase Migration – Feature: Integrations

**Branch:** `feature/integrations`  
**Migration File:**  
`apps/web/supabase/migration/20250731105515_additional-integrations.sql`

This migration introduces two new integration tables to support Folk and Slack token storage.

## ✅ Added Tables

### `folk_tokens`
- Stores Folk API tokens linked to users and accounts.
- Includes fields like `api_key`, `email_address`, `api_domain`, and `user_info`.

### `slack_tokens`
- Stores Slack OAuth tokens and related metadata.
- Includes fields like `access_token`, `team_id`, `authed_user_id`, and `webhook_url`.

## ⚙️ Features
- Row Level Security (RLS) enabled on both tables.
- Foreign key constraints:
  - `account_id → accounts(id)`
  - `user_id → auth.users(id)`
- Unique and indexed keys for optimized access.
- Access policies for authenticated users (`has_role_on_account`).
- `updated_at` is automatically managed via triggers.


/*
 * -------------------------------------------------------
 * Section: Enums
 * We create the enums for the schema
 * -------------------------------------------------------
 */

/*
* Permissions
- We create the permissions for the Supabase MakerKit. These permissions are used to manage the permissions for the roles
- The permissions are 'roles.manage', 'billing.manage', 'settings.manage', 'members.manage', and 'invites.manage'.
- You can add more permissions as needed.
*/
create type public.app_permissions as enum(
  'roles.manage',
  'billing.manage',
  'settings.manage',
  'members.manage',
  'invites.manage'
);

/*
* Subscription Status
- We create the subscription status for the Supabase MakerKit. These statuses are used to manage the status of the subscriptions
- The statuses are 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', and 'paused'.
- You can add more statuses as needed.
*/
create type public.subscription_status as ENUM(
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused'
);

/*
Payment Status
- We create the payment status for the Supabase MakerKit. These statuses are used to manage the status of the payments
*/
create type public.payment_status as ENUM('pending', 'succeeded', 'failed');

/*
* Billing Provider
- We create the billing provider for the Supabase MakerKit. These providers are used to manage the billing provider for the accounts
- The providers are 'stripe', 'lemon-squeezy', and 'paddle'.
- You can add more providers as needed.
*/
create type public.billing_provider as ENUM('stripe', 'lemon-squeezy', 'paddle');

/*
* Subscription Item Type
- We create the subscription item type for the Supabase MakerKit. These types are used to manage the type of the subscription items
- The types are 'flat', 'per_seat', and 'metered'.
- You can add more types as needed.
*/
create type public.subscription_item_type as ENUM('flat', 'per_seat', 'metered');

/*
* Invitation Type
- We create the invitation type for the Supabase MakerKit. These types are used to manage the type of the invitation
*/
create type public.invitation as (email text, role varchar(50));




/*
 * -------------------------------------------------------
 * Section: Custom Application Enums
 * Custom enums for your CRM/Meeting application
 * -------------------------------------------------------
 */

/*
* Contact Role Type
- Used to categorize contacts in deals by their role in decision making
*/
CREATE TYPE public.contact_role_type AS ENUM(
  'technical',
  'financial',
  'executive',
  'other'
);

/*
* Deal Stage
- Represents the current stage of a deal in the sales pipeline
*/
CREATE TYPE public.deal_stage AS ENUM(
  'interested',
  'contacted',
  'demo',
  'proposal',
  'negotiation',
  'won',
  'lost'
);

/*
* Email Provider
- Supported email providers for integration
*/
CREATE TYPE public.email_provider AS ENUM(
  'gmail'
);

/*
* Impact Level
- Used to measure the impact of various events or actions
*/
CREATE TYPE public.impact AS ENUM(
  'low',
  'medium',
  'high'
);

/*
* Momentum Marker Type
- Used to track positive, neutral, or negative momentum indicators
*/
CREATE TYPE public.marker_type AS ENUM(
  'positive',
  'neutral',
  'negative'
);

/*
* Momentum Trend
- Represents the direction of deal momentum over time
*/
CREATE TYPE public.momentum_trend AS ENUM(
  'up',
  'down',
  'steady'
);

/*
* Notification Channel
- Channels through which notifications can be delivered
*/
-- CREATE TYPE public.notification_channel AS ENUM(
--   'in_app',
--   'email'
-- );

/*
* Notification Type
- Types of notifications for different severity levels
*/
-- CREATE TYPE public.notification_type AS ENUM(
--   'info',
--   'warning',
--   'error'
-- );
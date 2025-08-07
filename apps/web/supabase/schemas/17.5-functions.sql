/*
 * -------------------------------------------------------
 * Section: Custom Functions
 * Custom functions for your CRM/Meeting application
 * These must be created before tables that reference them
 * -------------------------------------------------------
 */

/*
* Update Last Updated Column Function
- Trigger function to automatically update the last_updated column
*/
CREATE OR REPLACE FUNCTION public.update_last_updated_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.last_updated = now();
   RETURN NEW;
END;
$function$;

/*
* Update Analysis Jobs Updated At Function
- Trigger function to automatically update the updated_at column for analysis_jobs
*/
CREATE OR REPLACE FUNCTION public.update_analysis_jobs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$;

/*
* Get Gmail Emails Function
- Function to retrieve Gmail emails with filtering and pagination
*/
CREATE OR REPLACE FUNCTION public.get_gmail_emails(p_account_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_search text DEFAULT ''::text, p_labels text[] DEFAULT ARRAY['INBOX'::text], p_sort_by text DEFAULT 'received_at'::text, p_sort_direction text DEFAULT 'desc'::text)
 RETURNS TABLE(id uuid, gmail_message_id character varying, subject text, from_email character varying, from_name character varying, to_email character varying, to_name character varying, body_text text, is_read boolean, is_starred boolean, received_at timestamp with time zone, labels text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  query_text TEXT;
  sort_clause TEXT;
BEGIN
  -- Verify access
  IF NOT public.has_role_on_account(p_account_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Build sort clause
  sort_clause := CASE 
    WHEN p_sort_by = 'received_at' AND p_sort_direction = 'desc' THEN 'ORDER BY received_at DESC'
    WHEN p_sort_by = 'received_at' AND p_sort_direction = 'asc' THEN 'ORDER BY received_at ASC'
    WHEN p_sort_by = 'subject' AND p_sort_direction = 'asc' THEN 'ORDER BY subject ASC'
    WHEN p_sort_by = 'subject' AND p_sort_direction = 'desc' THEN 'ORDER BY subject DESC'
    ELSE 'ORDER BY received_at DESC'
  END;

  -- Build and execute query
  query_text := format('
    SELECT e.id, e.gmail_message_id, e.subject, e.from_email, e.from_name, 
           e.to_email, e.to_name, e.body_text, e.is_read, e.is_starred, 
           e.received_at, e.labels
    FROM public.emails e
    WHERE e.account_id = $1
      AND ($2 = '''' OR (
        e.subject ILIKE ''%%'' || $2 || ''%%'' OR
        e.from_email ILIKE ''%%'' || $2 || ''%%'' OR
        e.from_name ILIKE ''%%'' || $2 || ''%%'' OR
        e.body_text ILIKE ''%%'' || $2 || ''%%''
      ))
      AND ($3 = ARRAY[]::TEXT[] OR e.labels && $3)
    %s
    LIMIT $4 OFFSET $5
  ', sort_clause);

  RETURN QUERY EXECUTE query_text 
    USING p_account_id, p_search, p_labels, p_limit, p_offset;
END;
$function$;


/*
* Trigger Set Updated At Function
- Standard trigger function to automatically update the updated_at column
*/
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
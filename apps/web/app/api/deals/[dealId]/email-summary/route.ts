import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const supabase = getSupabaseServerClient();
    const dealId = (await params).dealId;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Generating email summary for deal:', dealId);

    // Get deal information
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('company_name, primary_email')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Get deal contacts
    const { data: dealContacts, error: contactsError } = await supabase
      .from('deal_contacts')
      .select('email')
      .eq('deal_id', dealId)
      .not('email', 'is', null);

    // Extract contact emails (including primary deal email)
    const contactEmails = [
      deal.primary_email,
      ...(dealContacts?.map((dc) => dc.email) || []),
    ].filter(Boolean);

    if (contactEmails.length === 0) {
      return NextResponse.json({
        success: true,
        summary: null,
        message: 'No contact emails found for this deal',
      });
    }

    console.log('📧 Looking for emails from contacts:', contactEmails);

    // Fetch the last 3 deal-related emails
    const { data: emails, error: emailError } = await supabase
      .from('emails')
      .select('from_email, to_email, subject, body_text, received_at')
      .eq('account_id', accountId)
      .or(
        `from_email.in.(${contactEmails.join(',')}),to_email.cs.{${contactEmails.join(',')}}`
      )
      .order('received_at', { ascending: false })
      .limit(3);

    if (emailError) {
      console.error('❌ Error fetching emails:', emailError);
      return NextResponse.json(
        { error: 'Failed to fetch emails' },
        { status: 500 }
      );
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({
        success: true,
        summary: null,
        message: 'No emails found for this deal',
      });
    }

    console.log(`📧 Found ${emails.length} emails to summarize`);

    // Format emails for AI analysis
    const emailsText = emails
      .map((email, index) => {
        const date = new Date(email.received_at).toLocaleDateString();
        return `Email ${index + 1} (${date}):
From: ${email.from_email}
To: ${email.to_email}
Subject: ${email.subject || 'No subject'}
Content: ${email.body_text || 'No content'}

---`;
      })
      .join('\n');

    const prompt = `You are analyzing email communications for a B2B deal with ${deal.company_name}. 

Please analyze the following ${emails.length} most recent emails and provide a concise summary focusing on:
- Key discussion points and topics
- Current status of conversations
- Any action items or next steps mentioned
- Overall sentiment and engagement level
- Important decisions or agreements

Keep the summary under 200 words and focus on actionable insights.

Emails to analyze:

${emailsText}

Provide only the summary without any prefix or explanation.`;

    try {
      console.log('🤖 Sending email content to OpenAI for analysis...');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const summary = completion.choices[0]?.message?.content || '';

      if (!summary.trim()) {
        return NextResponse.json({
          success: true,
          summary: null,
          message: 'Unable to generate summary from emails',
        });
      }

      console.log('✅ Email summary generated successfully');

      // Optionally store the summary in the deal record
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          email_summary: summary,
          email_summary_updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', dealId)
        .eq('account_id', accountId);

      if (updateError) {
        console.warn('⚠️ Could not store email summary in deal:', updateError.message);
      }

      return NextResponse.json({
        success: true,
        summary,
        emailCount: emails.length,
        lastEmailDate: emails[0]?.received_at,
      });

    } catch (aiError) {
      console.error('❌ OpenAI API error:', aiError);
      return NextResponse.json(
        { error: 'Failed to generate email summary' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error in email summary API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// MeetGeek API endpoints based on documentation
const MEETGEEK_API_BASE =
  process.env.MEETGEEK_API_URL || 'https://api.meetgeek.ai';
const MEETGEEK_API_KEY = process.env.MEETGEEK_API_KEY;

interface MeetGeekMeeting {
  host_email: string;
  language: string;
  meeting_id: string;
  participant_emails: string[];
  source: string;
  timestamp_end_utc: string;
  timestamp_start_utc: string;
  timezone: string;
  title: string;
}

interface MeetGeekTranscript {
  sentence_id: number;
  speaker: string;
  text: string;
  timestamp: string;
}

interface AnalysisResult {
  painPoints: string[];
  nextSteps: string[];
  greenFlags: string[];
  redFlags: string[];
  organizationalContext: string[];
  competitorMentions: string[];
  sentimentAndEngagement: string[];
}

function parseAnalysisText(analysisText: string): AnalysisResult {
  const result: AnalysisResult = {
    painPoints: [],
    nextSteps: [],
    greenFlags: [],
    redFlags: [],
    organizationalContext: [],
    competitorMentions: [],
    sentimentAndEngagement: [],
  };

  // Try to parse as JSON first (handle markdown code blocks)
  try {
    // Remove markdown code block wrapper if present
    let cleanText = analysisText.trim();
    if (cleanText.startsWith('```json') && cleanText.endsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```') && cleanText.endsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const jsonResult = JSON.parse(cleanText);
    if (jsonResult.painPoints || jsonResult.nextSteps) {
      return {
        painPoints: jsonResult.painPoints || [],
        nextSteps: jsonResult.nextSteps || [],
        greenFlags: jsonResult.greenFlags || [],
        redFlags: jsonResult.redFlags || [],
        organizationalContext: jsonResult.organizationalContext || [],
        competitorMentions: jsonResult.competitorMentions || [],
        sentimentAndEngagement: jsonResult.sentimentAndEngagement || [],
      };
    }
  } catch {
    // Continue with text parsing
  }

  const sections = analysisText.split(/###\s+\d+\.\s+|##\s+/);

  sections.forEach((section) => {
    const lines = section
      .split('\n')
      .filter(
        (line) => line.trim().startsWith('*') || line.trim().startsWith('-'),
      );
    const bulletPoints = lines
      .map((line) => line.replace(/^[\*\-]\s*/, '').trim())
      .filter(Boolean);

    if (section.toLowerCase().includes('pain points')) {
      result.painPoints = bulletPoints;
    } else if (
      section.toLowerCase().includes('next-step') ||
      section.toLowerCase().includes('next step')
    ) {
      result.nextSteps = bulletPoints;
    } else if (section.toLowerCase().includes('green flags')) {
      result.greenFlags = bulletPoints;
    } else if (section.toLowerCase().includes('red flags')) {
      result.redFlags = bulletPoints;
    } else if (section.toLowerCase().includes('organizational context')) {
      result.organizationalContext = bulletPoints;
    } else if (section.toLowerCase().includes('competitor')) {
      result.competitorMentions = bulletPoints;
    } else if (section.toLowerCase().includes('sentiment')) {
      result.sentimentAndEngagement = bulletPoints;
    }
  });

  return result;
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const { meetingId } = await request.json();

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 },
      );
    }

    if (!MEETGEEK_API_KEY) {
      return NextResponse.json(
        {
          error: 'MeetGeek API key not configured',
          message: 'Please add MEETGEEK_API_KEY to your environment variables',
        },
        { status: 500 },
      );
    }

    console.log(
      '🔄 Syncing MeetGeek meeting:',
      meetingId,
      'for account:',
      accountId,
    );
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasMeetGeekKey: !!MEETGEEK_API_KEY,
    });

    // Initialize Supabase client
    const supabase = getSupabaseServerClient();

    // Verify account exists and user has access
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('❌ Account not found or inaccessible:', accountError);
      return NextResponse.json(
        { error: 'Account not found or inaccessible' },
        { status: 404 },
      );
    }

    console.log('✅ Account verified:', account.name);

    // 1. Fetch meeting details from MeetGeek
    console.log('📥 Fetching meeting details from MeetGeek...');
    // Handle API key that may already include "Bearer" prefix
    const authHeader = MEETGEEK_API_KEY.startsWith('Bearer ')
      ? MEETGEEK_API_KEY
      : `Bearer ${MEETGEEK_API_KEY}`;

    const meetingResponse = await fetch(
      `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    if (!meetingResponse.ok) {
      const errorText = await meetingResponse.text();
      console.error('MeetGeek API error:', {
        status: meetingResponse.status,
        statusText: meetingResponse.statusText,
        error: errorText,
        url: `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}`,
      });

      // Check if it's a 404 - meeting might not be ready yet
      if (meetingResponse.status === 404) {
        return NextResponse.json(
          {
            error: 'Meeting not found in MeetGeek',
            message:
              'The meeting may still be processing. Please try again in a few minutes.',
            meetingId,
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch meeting from MeetGeek',
          details: errorText,
          status: meetingResponse.status,
        },
        { status: meetingResponse.status },
      );
    }

    const meetingData: MeetGeekMeeting = await meetingResponse.json();
    console.log('✅ Fetched meeting:', meetingData.title);

    // 2. Fetch transcript from MeetGeek
    console.log('📥 Fetching transcript from MeetGeek...');
    const transcriptResponse = await fetch(
      `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}/transcript`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    let transcriptData: MeetGeekTranscript[] = [];
    if (transcriptResponse.ok) {
      const transcriptResult = await transcriptResponse.json();
      console.log(
        '📝 Transcript response:',
        JSON.stringify(transcriptResult).substring(0, 200),
      );

      // Handle different possible response formats
      if (Array.isArray(transcriptResult)) {
        transcriptData = transcriptResult;
      } else if (transcriptResult.transcript) {
        transcriptData = transcriptResult.transcript;
      } else if (transcriptResult.segments) {
        transcriptData = transcriptResult.segments;
      } else if (transcriptResult.sentences) {
        // Handle MeetGeek sentences format
        console.log(
          '🔄 Converting MeetGeek sentences format to transcript format',
        );
        transcriptData = transcriptResult.sentences.map((sentence: any) => ({
          sentence_id: sentence.id,
          speaker: sentence.speaker || 'Unknown speaker',
          text: sentence.transcript,
          timestamp: sentence.timestamp,
        }));
        console.log(
          `🔄 Converted ${transcriptData.length} sentences to transcript format`,
        );
      } else {
        console.warn('⚠️ Unexpected transcript format:', transcriptResult);
      }

      console.log(`✅ Fetched ${transcriptData.length} transcript segments`);
    } else {
      console.warn(
        '⚠️ Transcript not available yet:',
        transcriptResponse.status,
      );
    }

    // 3. Fetch summary from MeetGeek
    console.log('📥 Fetching summary from MeetGeek...');
    const summaryResponse = await fetch(
      `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}/summary`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    let summaryData: any = null;
    if (summaryResponse.ok) {
      summaryData = await summaryResponse.json();
      console.log('✅ Fetched meeting summary');
    }

    // 4. Fetch highlights from MeetGeek
    console.log('📥 Fetching highlights from MeetGeek...');
    const highlightsResponse = await fetch(
      `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}/highlights`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    let highlightsData: any[] = [];
    if (highlightsResponse.ok) {
      const highlightsResult = await highlightsResponse.json();
      // Handle different possible response formats
      highlightsData = Array.isArray(highlightsResult)
        ? highlightsResult
        : highlightsResult.highlights || [];
      console.log(`✅ Fetched ${highlightsData.length} highlights`);
    }

    // 5. Find or create the scheduled meeting in Supabase
    let { data: scheduledMeeting, error: scheduledError } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .eq('meetgeek_meeting_id', meetingId)
      .eq('account_id', accountId)
      .single();

    if (scheduledError || !scheduledMeeting) {
      console.log('⚠️ No scheduled meeting found for MeetGeek ID:', meetingId);
      console.log('🔧 Auto-creating scheduled meeting record...');

      // Create a scheduled meeting record for this MeetGeek meeting
      // We need to determine which deal this belongs to - for now, use the first deal for the account
      console.log('🔍 Finding account deals to auto-link meeting...');
      const { data: accountDeals, error: dealsError } = await supabase
        .from('deals')
        .select('id, company_name')
        .eq('account_id', accountId)
        .limit(1);

      if (dealsError || !accountDeals || accountDeals.length === 0) {
        console.error('❌ No deals found to link meeting to:', dealsError);
        return NextResponse.json(
          {
            error: 'No deals found to link meeting',
            accountId,
            meetingId,
            details:
              'Cannot auto-create scheduled meeting without a deal to link to',
          },
          { status: 404 },
        );
      }

      const dealToLink = accountDeals[0];
      console.log('🔗 Auto-linking meeting to deal:', dealToLink.company_name);

      const autoScheduledMeeting = {
        account_id: accountId,
        deal_id: dealToLink.id,
        meetgeek_meeting_id: meetingId,
        meeting_title: meetingData.title || 'Auto-imported Meeting',
        status: 'completed', // Since transcript exists, meeting is completed
        start_time: meetingData.timestamp_start_utc || new Date().toISOString(),
        end_time: meetingData.timestamp_end_utc || new Date().toISOString(),
        attendees: meetingData.participant_emails || [],
        created_at: new Date().toISOString(),
      };

      const { data: newScheduledMeeting, error: createError } = await supabase
        .from('scheduled_meetings')
        .insert(autoScheduledMeeting)
        .select('*')
        .single();

      if (createError || !newScheduledMeeting) {
        console.error(
          '❌ Failed to auto-create scheduled meeting:',
          createError,
        );
        return NextResponse.json(
          {
            error: 'Failed to create scheduled meeting',
            accountId,
            meetingId,
            details:
              createError?.message ||
              'Unknown error creating scheduled meeting',
          },
          { status: 500 },
        );
      }

      console.log('✅ Auto-created scheduled meeting:', newScheduledMeeting.id);
      scheduledMeeting = newScheduledMeeting;
    } else {
      console.log('✅ Found existing scheduled meeting:', scheduledMeeting.id);
    }

    // 5.1. Validate deal ownership to prevent orphaned meetings
    console.log(
      '🔍 Validating deal ownership for deal:',
      scheduledMeeting.deal_id,
    );
    const { data: dealOwnership, error: dealValidationError } = await supabase
      .from('deals')
      .select('id, company_name')
      .eq('id', scheduledMeeting.deal_id)
      .eq('account_id', accountId)
      .single();

    if (dealValidationError || !dealOwnership) {
      console.error('❌ Deal not found or inaccessible:', {
        error: dealValidationError,
        dealId: scheduledMeeting.deal_id,
        scheduledMeetingId: scheduledMeeting.id,
        accountId,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Deal not found or inaccessible - cannot link transcript',
          details:
            'The meeting is associated with a deal that does not exist or is not accessible',
          dealId: scheduledMeeting.deal_id,
          accountId,
          meetingId,
        },
        { status: 404 },
      );
    }

    console.log('✅ Deal ownership validated:', {
      dealId: dealOwnership.id,
      companyName: dealOwnership.company_name,
      accountId,
    });

    // 6. Create or update meeting record in meetings table
    console.log('📋 DEBUG: Preparing meeting record for insertion');
    console.log('📋 Scheduled meeting data:', {
      id: scheduledMeeting.id,
      deal_id: scheduledMeeting.deal_id,
      meeting_title: scheduledMeeting.meeting_title,
    });
    console.log('📋 MeetGeek data received:', {
      title: meetingData.title,
      host_email: meetingData.host_email,
      source: meetingData.source,
      language: meetingData.language,
      timezone: meetingData.timezone,
      participant_count: meetingData.participant_emails?.length || 0,
    });
    console.log('📋 Summary data:', {
      hasSummary: !!summaryData?.summary,
      summaryLength: summaryData?.summary?.length || 0,
    });
    console.log('📋 Highlights data:', {
      hasHighlights: Array.isArray(highlightsData),
      highlightsCount: highlightsData?.length || 0,
    });

    // Create meeting record with core metadata only (modular system handles summary/highlights/actions)
    // Map MeetGeek source values to allowed constraint values: 'meetgeek', 'manual', 'calendar', 'google_meet'
    let sourceValue = 'meetgeek'; // Default fallback to meetgeek since this comes from MeetGeek
    if (meetingData.source) {
      const sourceMapping: Record<string, string> = {
        google: 'google_meet',
        zoom: 'meetgeek', // No specific zoom option, use meetgeek
        teams: 'meetgeek', // No specific teams option, use meetgeek
        invitation: 'google_meet', // Map invitation to google_meet
        calendar: 'calendar',
        meet: 'google_meet',
        google_meet: 'google_meet',
        meetgeek: 'meetgeek',
        manual: 'manual',
      };
      sourceValue =
        sourceMapping[meetingData.source.toLowerCase()] || 'meetgeek';
    }

    const meetingRecord = {
      account_id: accountId,
      meeting_id: meetingId,
      deal_id: scheduledMeeting.deal_id,
      title: meetingData.title || scheduledMeeting.meeting_title || 'Meeting',
      host_email: meetingData.host_email,
      source: sourceValue, // Use mapped value that satisfies CHECK constraint
      language: meetingData.language || 'en-US',
      timestamp_start_utc: meetingData.timestamp_start_utc,
      timestamp_end_utc: meetingData.timestamp_end_utc,
      timezone: meetingData.timezone || 'UTC',
      participant_emails: meetingData.participant_emails || [],
      recording_url: null, // MeetGeek doesn't provide this in current API
      duration:
        meetingData.timestamp_end_utc && meetingData.timestamp_start_utc
          ? Math.round(
              (new Date(meetingData.timestamp_end_utc).getTime() -
                new Date(meetingData.timestamp_start_utc).getTime()) /
                1000,
            )
          : null,
      start_time: meetingData.timestamp_start_utc,
      end_time: meetingData.timestamp_end_utc,
    };

    console.log(
      '📋 Meeting record (schema-compatible):',
      JSON.stringify(meetingRecord, null, 2),
    );

    // Check if meeting already exists (using meeting_id and account_id)
    console.log('🔍 DEBUG: Checking if meeting already exists in database');
    const { data: existingMeeting, error: checkError } = await supabase
      .from('meetings')
      .select('id')
      .eq('meeting_id', meetingId)
      // .eq('account_id', accountId)
      .single();

    console.log('🔍 Existing meeting check result:', {
      found: !!existingMeeting,
      error: checkError?.message,
      meetingId: existingMeeting?.id,
      accountId,
    });

    let meetingDatabaseId: string | null = null;

    if (existingMeeting) {
      // Update existing meeting
      console.log('🔄 DEBUG: Updating existing meeting record');
      const { data: updatedMeeting, error: updateError } = await supabase
        .from('meetings')
        .update(meetingRecord)
        .eq('meeting_id', meetingId)
        // .eq('account_id', accountId)
        .select('id')
        .single();

      if (updateError) {
        console.error('❌ Error updating meeting:', updateError);
        console.error(
          '❌ Update error details:',
          JSON.stringify(updateError, null, 2),
        );
      } else {
        console.log('✅ Updated existing meeting record successfully');
        meetingDatabaseId = existingMeeting.id;
        console.log('✅ Database meeting ID:', meetingDatabaseId);
      }
    } else {
      // Insert new meeting
      console.log('➕ DEBUG: Inserting new meeting record');
      const { data: newMeeting, error: insertError } = await supabase
        .from('meetings')
        .insert(meetingRecord)
        .select('id')
        .single();

      if (insertError) {
        console.error('❌ Error inserting meeting:', insertError);
        console.error(
          '❌ Insert error details:',
          JSON.stringify(insertError, null, 2),
        );
      } else {
        console.log('✅ Created new meeting record successfully');
        meetingDatabaseId = newMeeting?.id;
        console.log('✅ New database meeting ID:', meetingDatabaseId);

        // Verify the meeting was actually inserted
        console.log('🔍 DEBUG: Verifying meeting was inserted');
        const { data: verifyMeeting, error: verifyError } = await supabase
          .from('meetings')
          .select('id, meeting_id, title')
          .eq('id', meetingDatabaseId)
          // .eq('account_id', accountId)
          .single();

        if (verifyError) {
          console.error('❌ Could not verify meeting insert:', verifyError);
          meetingDatabaseId = null;
        } else {
          console.log('✅ Meeting verification successful:', verifyMeeting);
        }
      }
    }

    // 7. Store transcript segments if available
    console.log('📝 DEBUG: Transcript storage process');
    console.log('📝 Transcript data available:', {
      segmentCount: transcriptData.length,
      hasMeetingId: !!meetingDatabaseId,
      meetingDatabaseId: meetingDatabaseId,
      accountId,
    });

    if (transcriptData.length > 0 && meetingDatabaseId) {
      console.log('📝 Starting transcript storage process');
      console.log('📝 Meeting database ID for transcripts:', meetingDatabaseId);

      // Add a small delay to ensure meeting is fully committed
      console.log('⏱️ Waiting for meeting commit...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Double-check that the meeting exists before inserting transcripts
      console.log(
        '🔍 Final verification: Checking meeting exists before transcript insert',
      );
      const { data: finalCheck, error: finalCheckError } = await supabase
        .from('meetings')
        .select('id')
        .eq('id', meetingDatabaseId)
        // .eq('account_id', accountId)
        .single();

      if (finalCheckError || !finalCheck) {
        console.error(
          '❌ Final check failed - meeting not found:',
          finalCheckError,
        );
        console.error('❌ Cannot proceed with transcript insert');
        return NextResponse.json(
          {
            success: false,
            error: 'Meeting insert failed - cannot store transcripts',
            details: finalCheckError,
            accountId,
          },
          { status: 500 },
        );
      } else {
        console.log('✅ Final check passed - meeting exists:', finalCheck.id);
      }

      // Delete existing transcript segments for this meeting
      console.log(
        '🗑️ Deleting existing transcripts for meeting:',
        meetingDatabaseId,
      );
      const { error: deleteError } = await supabase
        .from('transcripts')
        .delete()
        .eq('meeting_id', meetingDatabaseId)
        .eq('account_id', accountId);

      if (deleteError) {
        console.log(
          '⚠️ Error deleting existing transcripts (may not exist):',
          deleteError,
        );
      } else {
        console.log('✅ Cleared existing transcripts');
      }

      // Insert new transcript segments
      const transcriptRecords = transcriptData.map(
        (segment: MeetGeekTranscript) => ({
          account_id: accountId,
          meeting_id: meetingDatabaseId, // Use the database ID, not MeetGeek ID
          sentence_id: segment.sentence_id,
          speaker: segment.speaker,
          transcript: segment.text,
          timestamp: new Date(segment.timestamp), // Convert to proper timestamp
        }),
      );

      console.log('📝 Prepared transcript records:', {
        recordCount: transcriptRecords.length,
        sampleRecord: transcriptRecords[0],
        allRecordsPreview: transcriptRecords.map((r) => ({
          sentence_id: r.sentence_id,
          speaker: r.speaker,
          textLength: r.transcript.length,
          timestamp: r.timestamp,
        })),
      });

      // Test RLS and foreign key constraint by trying a simple insert first
      console.log('🧪 Testing transcript insert with single record');
      const testRecord = transcriptRecords[0];
      console.log('🧪 Test record:', testRecord);

      const { data: testInsert, error: testInsertError } = await supabase
        .from('transcripts')
        .insert([testRecord])
        .select('id, sentence_id');

      if (testInsertError) {
        console.error('❌ Test transcript insert failed:', testInsertError);

        // Try to check if RLS is the issue by using the service role directly
        console.log('🔍 Checking if this is an RLS issue...');

        // Let's try to query the meetings table with the same meeting_id
        const { data: verifyMeetingForTranscript, error: verifyMeetingError } =
          await supabase
            .from('meetings')
            .select('id, meeting_id')
            .eq('id', meetingDatabaseId);
        // .eq('account_id', accountId);

        console.log('🔍 Meeting verification for transcript context:', {
          found: !!verifyMeetingForTranscript,
          error: verifyMeetingError,
          data: verifyMeetingForTranscript,
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Transcript insert failed - foreign key constraint',
            details: {
              meetingId: meetingDatabaseId,
              transcriptError: testInsertError,
              verificationResult: verifyMeetingForTranscript,
              accountId,
            },
          },
          { status: 500 },
        );
      } else {
        console.log('✅ Test transcript insert succeeded:', testInsert);

        // If test worked, proceed with full insert
        console.log('💾 Inserting remaining transcript records into database');
        const remainingRecords = transcriptRecords.slice(1);

        const { data: insertedTranscripts, error: transcriptError } =
          await supabase
            .from('transcripts')
            .insert(remainingRecords)
            .select('id, sentence_id');

        if (transcriptError) {
          console.error(
            '❌ Error inserting remaining transcripts:',
            transcriptError,
          );
          console.error(
            '❌ Bulk transcript insert failed - this is the root cause!',
          );
          console.error(
            '❌ Error details:',
            JSON.stringify(transcriptError, null, 2),
          );

          // Clean up the test record that was successfully inserted
          console.log(
            '🧹 Cleaning up test transcript record due to bulk insert failure',
          );
          await supabase
            .from('transcripts')
            .delete()
            .eq('id', testInsert[0].id)
            .eq('account_id', accountId);

          // Don't fail the entire sync, but log that transcripts failed
          console.log(
            '⚠️ Continuing sync without transcripts due to insert failure',
          );
        } else {
          console.log(
            `✅ Stored ${transcriptRecords.length} transcript segments successfully`,
          );
          const allInserted = [testInsert[0], ...(insertedTranscripts || [])];
          console.log(
            '✅ All transcript IDs:',
            allInserted.map((t) => ({ id: t.id, sentence_id: t.sentence_id })),
          );
        }
      }
    } else if (transcriptData.length > 0 && !meetingDatabaseId) {
      console.error(
        '❌ Cannot store transcripts: meeting database ID not available',
      );
      console.error('❌ Transcript data exists but no meeting ID:', {
        transcriptSegments: transcriptData.length,
        meetingDatabaseId: meetingDatabaseId,
        meetgeekMeetingId: meetingId,
        accountId,
      });
    } else if (transcriptData.length === 0) {
      console.log(
        '⚠️ No transcript data to store (transcript may not be ready yet)',
      );
    }

    // 7.5. Store MeetGeek summary and highlights in modular tables if meeting was created
    if (meetingDatabaseId) {
      console.log('📊 Storing MeetGeek data in modular tables...');

      // Store summary from MeetGeek
      if (summaryData?.summary) {
        console.log('💬 Storing MeetGeek summary...');
        const { error: summaryError } = await supabase.from('summaries').upsert(
          {
            account_id: accountId,
            meeting_id: meetingDatabaseId,
            summary: summaryData.summary,
            ai_insights: JSON.stringify(summaryData),
          },
          {
            onConflict: 'meeting_id,account_id',
          },
        );

        if (summaryError) {
          console.error('❌ Error storing MeetGeek summary:', summaryError);
        } else {
          console.log('✅ Stored MeetGeek summary in modular table');
        }
      }

      // Store highlights from MeetGeek
      if (highlightsData?.length > 0) {
        console.log(
          `🎯 Storing ${highlightsData.length} MeetGeek highlights...`,
        );

        // Delete existing highlights for this meeting
        const { error: deleteHighlightsError } = await supabase
          .from('highlights')
          .delete()
          .eq('meeting_id', meetingDatabaseId)
          .eq('account_id', accountId);

        if (deleteHighlightsError) {
          console.log(
            '⚠️ Error deleting existing highlights:',
            deleteHighlightsError,
          );
        }

        const highlightRecords = highlightsData.map(
          (highlight: any, index: number) => ({
            account_id: accountId,
            meeting_id: meetingDatabaseId,
            highlight:
              typeof highlight === 'string'
                ? highlight
                : highlight.text || highlight.highlight,
          }),
        );

        const { error: highlightsError } = await supabase
          .from('highlights')
          .insert(highlightRecords);

        if (highlightsError) {
          console.error(
            '❌ Error storing MeetGeek highlights:',
            highlightsError,
          );
        } else {
          console.log('✅ Stored MeetGeek highlights in modular table');
        }
      }
    }

    // 8. Update scheduled meeting status
    const { error: statusError } = await supabase
      .from('scheduled_meetings')
      .update({ status: 'completed' })
      .eq('meetgeek_meeting_id', meetingId)
      .eq('account_id', accountId);

    if (statusError) {
      console.error('Error updating scheduled meeting status:', statusError);
    } else {
      console.log('✅ Updated scheduled meeting status to completed');
    }

    // 9. NEW MODULAR AI ANALYSIS - Use the new modular system
    let aiAnalysisResult = null;
    if (transcriptData.length > 0 && meetingDatabaseId) {
      console.log('🤖 Starting modular AI analysis...');

      try {
        // Create analysis jobs and trigger processing
        console.log('📋 Creating analysis jobs for modular processing...');

        const analysisTypes = ['summary', 'highlights', 'actions'];
        const jobPromises = analysisTypes.map(async (jobType) => {
          // Create analysis job
          const { data: job, error: jobError } = await supabase
            .from('analysis_jobs')
            .insert({
              meeting_id: meetingDatabaseId,
              job_type: jobType,
              status: 'processing',
              model_used: 'gpt-4',
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (jobError) {
            console.error(`❌ Error creating ${jobType} job:`, jobError);
            return { type: jobType, success: false, error: jobError.message };
          }

          console.log(`✅ Created ${jobType} analysis job: ${job.id}`);
          return { type: jobType, success: true, jobId: job.id };
        });

        console.log('⚡ Creating analysis jobs...');
        const jobResults = await Promise.allSettled(jobPromises);

        let successCount = 0;
        const results: Record<string, any> = {};

        for (let i = 0; i < jobResults.length; i++) {
          const type = analysisTypes[i];
          const result = jobResults[i];

          if (result.status === 'fulfilled' && result.value.success) {
            results[type] = result.value;
            successCount++;
            console.log(`✅ ${type} job created successfully`);
          } else {
            const errorMessage =
              result.status === 'rejected' ? result.reason : result.value.error;
            console.error(`❌ ${type} job creation failed:`, errorMessage);
            results[type] = { success: false, error: errorMessage };
          }
        }

        // Note: The actual AI processing will happen when the modular APIs are called later
        console.log(
          `✅ Analysis jobs created: ${successCount}/${analysisTypes.length} successful`,
        );

        aiAnalysisResult = {
          success: successCount > 0,
          modular: true,
          results,
          successCount,
          totalAnalyses: analysisTypes.length,
          message: `Created ${successCount} analysis jobs. AI processing will occur when APIs are called.`,
        };
      } catch (analysisError) {
        console.error('Error creating analysis jobs:', analysisError);
        aiAnalysisResult = {
          success: false,
          modular: true,
          error:
            analysisError instanceof Error
              ? analysisError.message
              : 'Unknown error',
          message: 'Failed to create analysis jobs',
        };
      }
    }

    // 10. Update deal with meeting insights and AI analysis
    const dealUpdate: any = {
      last_meeting_date:
        meetingData.timestamp_start_utc || new Date().toISOString(),
      last_meeting_type: 'meetgeek',
      meeting_highlights: highlightsData || [],
      meeting_action_items: [], // TODO: Extract action items from MeetGeek API
      last_updated: new Date().toISOString(),
    };

    // Only update meeting summary if we have a meaningful one
    // This preserves existing summaries when new meetings don't have summaries yet
    const newSummary = summaryData?.summary || 'Meeting completed - processing insights';
    if (summaryData?.summary && 
        summaryData.summary.trim() &&
        !summaryData.summary.includes('Meeting completed - processing') &&
        !summaryData.summary.includes('No summary available')) {
      dealUpdate.last_meeting_summary = summaryData.summary;
      dealUpdate.last_meeting_notes = summaryData.summary;
      console.log('✅ Updating deal with new meeting summary from MeetGeek');
    } else {
      console.log('ℹ️ Preserving existing meeting summary (MeetGeek summary not meaningful yet)');
      // Only update notes with placeholder, not the summary
      dealUpdate.last_meeting_notes = newSummary;
    }

    // Note: AI analysis results are now stored in separate modular tables
    // The new system stores summaries, highlights, and actions independently
    if (aiAnalysisResult?.success && aiAnalysisResult.modular) {
      dealUpdate.last_analysis_date = new Date().toISOString();
      // Individual analysis results are stored in their respective tables:
      // - summaries (for meeting summaries)
      // - highlights (for meeting highlights)
      // - deal_activities (for action items)
    }

    // Get current total meetings count
    const { data: currentDeal } = await supabase
      .from('deals')
      .select('total_meetings')
      .eq('id', scheduledMeeting.deal_id)
      .eq('account_id', accountId)
      .single();

    if (currentDeal) {
      dealUpdate.total_meetings = (currentDeal.total_meetings || 0) + 1;
    }

    const { error: dealError } = await supabase
      .from('deals')
      .update(dealUpdate)
      .eq('id', scheduledMeeting.deal_id)
      .eq('account_id', accountId);

    if (dealError) {
      console.error('Error updating deal:', dealError);
    } else {
      console.log('✅ Updated deal with meeting insights');
      
      // Trigger momentum scoring in the background after meeting updates (don't wait for it)
      if (scheduledMeeting.deal_id && accountId) {
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/momentum-scoring`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || '',
          },
          body: JSON.stringify({ dealId: scheduledMeeting.deal_id, accountId })
        }).catch(error => {
          console.error('❌ Background momentum scoring failed after meeting sync:', error);
        });
        console.log('🎯 Background momentum scoring triggered after meeting sync for deal:', scheduledMeeting.deal_id);
      }
    }

    // CRITICAL: Verify meeting was actually created before reporting success
    if (!meetingDatabaseId) {
      console.error(
        '❌ SYNC FAILED: Meeting record was not created in database',
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Meeting record creation failed',
          message:
            'Failed to create meeting record in database - transcript cannot be stored',
          data: {
            accountId,
            meetingId,
            title: meetingData.title,
            transcriptSegments: transcriptData.length,
            highlights: highlightsData.length,
            hasSummary: !!summaryData,
            meetingCreated: false,
            transcriptsStored: false,
          },
        },
        { status: 500 },
      );
    }

    // Verify transcripts were actually stored
    const { data: storedTranscripts, error: transcriptCountError } =
      await supabase
        .from('transcripts')
        .select('id')
        .eq('meeting_id', meetingDatabaseId)
        .eq('account_id', accountId);

    const transcriptsStored = storedTranscripts?.length || 0;

    console.log('📊 Final sync verification:', {
      accountId,
      meetingCreated: !!meetingDatabaseId,
      transcriptsExpected: transcriptData.length,
      transcriptsStored: transcriptsStored,
    });

    if (transcriptData.length > 0 && transcriptsStored === 0) {
      console.error(
        '❌ SYNC FAILED: No transcripts were stored despite having transcript data',
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Transcript storage failed',
          message: 'Meeting created but transcripts could not be stored',
          data: {
            accountId,
            meetingId,
            title: meetingData.title,
            transcriptSegments: transcriptData.length,
            highlights: highlightsData.length,
            hasSummary: !!summaryData,
            meetingCreated: true,
            transcriptsStored: false,
            meetingDatabaseId,
          },
        },
        { status: 500 },
      );
    }

    // 🚀 NEW: Trigger transcript processing - Try webhook first, fallback to direct API
    if (transcriptsStored > 0 && meetingDatabaseId && scheduledMeeting.deal_id) {
      try {
        const webhookUrl = process.env.TRANSCRIPT_PROCESSOR_WEBHOOK_URL || 'http://localhost:3003/webhooks/transcript-ready';
        
        console.log('🔗 Triggering transcript processor webhook...', {
          webhookUrl,
          meetingId: meetingDatabaseId,
          dealId: scheduledMeeting.deal_id,
          accountId
        });

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meeting_id: meetingDatabaseId,
            deal_id: scheduledMeeting.deal_id,
            account_id: accountId,
            event_type: 'transcript_created',
            timestamp: new Date().toISOString(),
          }),
        });

        if (webhookResponse.ok) {
          console.log('✅ Transcript processor webhook triggered successfully');
        } else {
          throw new Error(`Webhook failed with status ${webhookResponse.status}`);
        }
      } catch (webhookError) {
        console.error('❌ Webhook failed, trying direct analysis fallback:', webhookError);
        
        // Fallback: Trigger analysis directly using our internal API
        try {
          const currentUrl = new URL(request.url);
          const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
          
          console.log('🔄 Triggering direct comprehensive analysis...');
          
          const analysisResponse = await fetch(`${baseUrl}/api/analyze-comprehensive?accountId=${accountId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('Cookie') || '',
            },
            body: JSON.stringify({
              meetingId: meetingDatabaseId,
              accountId: accountId
            }),
          });

          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            console.log('✅ Direct analysis completed successfully:', {
              painPoints: analysisResult.analysis?.painPoints?.length || 0,
              nextSteps: analysisResult.analysis?.nextSteps?.length || 0,
              greenFlags: analysisResult.analysis?.greenFlags?.length || 0,
              redFlags: analysisResult.analysis?.redFlags?.length || 0
            });
          } else {
            const errorText = await analysisResponse.text();
            console.error('❌ Direct analysis also failed:', errorText);
          }
        } catch (directAnalysisError) {
          console.error('❌ Direct analysis fallback failed:', directAnalysisError);
          // Don't fail the entire sync - analysis can be triggered manually later
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully synced MeetGeek meeting data',
      data: {
        accountId,
        meetingId,
        title: meetingData.title,
        duration:
          meetingData.timestamp_end_utc && meetingData.timestamp_start_utc
            ? new Date(meetingData.timestamp_end_utc).getTime() -
              new Date(meetingData.timestamp_start_utc).getTime()
            : null,
        transcriptSegments: transcriptData.length,
        highlights: highlightsData.length,
        hasSummary: !!summaryData,
        meetingCreated: true,
        transcriptsStored: transcriptsStored,
        meetingDatabaseId,
        aiAnalysis: aiAnalysisResult,
      },
    });
  } catch (error) {
    console.error('Error syncing MeetGeek meeting:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync meeting',
        details: error instanceof Error ? error.message : 'Unknown error',
        accountId: new URL(request.url).searchParams.get('accountId'),
      },
      { status: 500 },
    );
  }
}

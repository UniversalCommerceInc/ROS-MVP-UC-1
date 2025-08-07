import { NextResponse } from 'next/server';

import { syncCalendarToMeetings } from '~/home/[account]/meetings/_lib/actions/sync-calender-meetings';

export async function POST(request: Request) {
  try {
    // Get accountId from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account ID is required',
        },
        { status: 400 },
      );
    }

    console.log('🔄 Starting calendar sync for account:', accountId);

    const result = await syncCalendarToMeetings(accountId);

    if (!result.success) {
      console.error('❌ Calendar sync failed:', result.error);

      // Check if it's a Gmail connection issue
      if (
        result.error?.includes('token') ||
        result.error?.includes('Gmail') ||
        result.error?.includes('authentication')
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Please connect Gmail & Calendar first. Go to Emails → Connect Gmail',
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }
    console.log('✅ Calendar sync completed:', {
      processed: result.processed,
      saved: result.saved,
      accountId,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      saved: result.saved,
      message:
        result.message ||
        `Successfully synced ${result.saved} out of ${result.processed} calendar events`,
      accountId,
    });
  } catch (error) {
    console.error('Sync calendar API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

'use client';

import { useState } from 'react';

import { AlertCircle, Link, RefreshCw } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';

import { useMeetGeek } from '../_lib/hooks/use-meetgeek';

interface SyncMeetingButtonProps {
  dealId: string;
}

export default function SyncMeetingButton({ dealId }: SyncMeetingButtonProps) {
  const [open, setOpen] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const { syncMeetingData, loading, error } = useMeetGeek();

  const handleSync = async () => {
    if (!meetingId.trim()) return;

    const result = await syncMeetingData(dealId, meetingId);
    if (result) {
      setOpen(false);
      setMeetingId('');
    }
  };

  // Check if Supabase environment variables are available
  const isSupabaseAvailable =
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link className="h-4 w-4" />
          Sync Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="border-gray-700 bg-gray-900 sm:max-w-[425px]">
        <DialogTitle>Sync Meeting</DialogTitle>
        <DialogDescription>
          {isSupabaseAvailable
            ? 'Enter the MeetGeek meeting ID to sync its data with this deal.'
            : 'Demo mode: Supabase environment variables not detected. This will simulate syncing.'}
        </DialogDescription>

        {!isSupabaseAvailable && (
          <div className="mb-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
              <div>
                <p className="text-sm text-yellow-200">Running in demo mode</p>
                <p className="mt-1 text-xs text-yellow-200/70">
                  Supabase environment variables are not configured. This
                  feature will simulate syncing without making actual API calls.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="meeting-id" className="text-right text-sm">
              Meeting ID
            </label>
            <Input
              id="meeting-id"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              placeholder="Enter MeetGeek meeting ID"
              className="col-span-3 border-gray-700 bg-gray-800"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSync}
            disabled={loading || !meetingId.trim()}
            className="bg-designer-violet hover:bg-designer-violet/90"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {isSupabaseAvailable ? 'Syncing...' : 'Simulating...'}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {isSupabaseAvailable ? 'Sync Meeting' : 'Simulate Sync'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

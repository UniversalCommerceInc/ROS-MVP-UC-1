'use client';

import { useState } from 'react';

import { addHours, format } from 'date-fns';

import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';

// import { cn } from "@/lib/utils"
// import { toast } from "sonner"

interface MeetingCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: Date, meetingDetails: MeetingDetails) => void;
  busyDates?: Date[];
  dealContact?: string;
  dealEmail?: string;
  dealName?: string;
}

interface MeetingDetails {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  attendees: string[];
}

export default function MeetingCalendarModal({
  isOpen,
  onClose,
  onDateSelect,
  busyDates = [],
  dealContact = '',
  dealEmail = '',
  dealName = '',
}: MeetingCalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails>({
    title: `Meeting with ${dealContact}`,
    startTime: '09:00',
    endTime: '10:00',
    description: `Meeting with ${dealContact} from ${dealName}`,
    location: 'Google Meet',
    attendees: [dealEmail],
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSubmit = () => {
    if (!selectedDate) return;

    // Combine date and time
    const startDateTime = new Date(selectedDate);
    const [startHours, startMinutes] = meetingDetails.startTime.split(':');
    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

    const endDateTime = new Date(selectedDate);
    const [endHours, endMinutes] = meetingDetails.endTime.split(':');
    endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

    onDateSelect(selectedDate, {
      ...meetingDetails,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-4 m-auto max-h-[calc(100vh-3rem)] overflow-y-auto border-gray-700 bg-gray-900 pt-6 sm:max-w-[425px]">
        <DialogTitle>Schedule Meeting</DialogTitle>
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border border-gray-700"
              modifiers={{
                busy: busyDates,
              }}
              modifiersStyles={{
                busy: {
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: 'rgb(239, 68, 68)',
                  fontWeight: 'bold',
                },
              }}
              disabled={(date) => {
                return (
                  date < new Date() ||
                  busyDates.some(
                    (busyDate) =>
                      date.getDate() === busyDate.getDate() &&
                      date.getMonth() === busyDate.getMonth() &&
                      date.getFullYear() === busyDate.getFullYear(),
                  )
                );
              }}
              classNames={{
                day_selected:
                  'bg-designer-violet text-white hover:bg-designer-violet hover:text-white focus:bg-designer-violet focus:text-white',
                day_today: 'bg-gray-800 text-white',
                day_outside: 'text-gray-500 opacity-50',
                day_disabled: 'text-gray-500 opacity-50',
                day_range_middle:
                  'aria-selected:bg-gray-800 aria-selected:text-white',
                day_hidden: 'invisible',
                nav_button: 'hover:bg-gray-800',
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                caption: 'text-white',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell:
                  'text-gray-400 rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
              }}
            />
          </div>

          {selectedDate && (
            <div className="space-y-4 border-t border-gray-700 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={meetingDetails.startTime}
                    onChange={(e) =>
                      setMeetingDetails({
                        ...meetingDetails,
                        startTime: e.target.value,
                      })
                    }
                    className="border-gray-700 bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={meetingDetails.endTime}
                    onChange={(e) =>
                      setMeetingDetails({
                        ...meetingDetails,
                        endTime: e.target.value,
                      })
                    }
                    className="border-gray-700 bg-gray-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input
                  id="title"
                  value={meetingDetails.title}
                  onChange={(e) =>
                    setMeetingDetails({
                      ...meetingDetails,
                      title: e.target.value,
                    })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={meetingDetails.description}
                  onChange={(e) =>
                    setMeetingDetails({
                      ...meetingDetails,
                      description: e.target.value,
                    })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={meetingDetails.location}
                  onChange={(e) =>
                    setMeetingDetails({
                      ...meetingDetails,
                      location: e.target.value,
                    })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-700 bg-gray-900 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate}
            className="bg-designer-violet hover:bg-designer-violet/90"
          >
            Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

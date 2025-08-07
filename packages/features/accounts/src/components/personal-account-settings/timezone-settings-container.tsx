'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from '@kit/ui/sonner';
import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { LoadingOverlay } from '@kit/ui/loading-overlay';
import { Trans } from '@kit/ui/trans';

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'UTC', label: 'UTC' },
];

interface TimezoneSettingsContainerProps {
  userId: string;
}

export function TimezoneSettingsContainer({ 
  userId
}: TimezoneSettingsContainerProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [currentTimezone, setCurrentTimezone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Fetch current timezone on component mount
  useEffect(() => {
    const fetchCurrentTimezone = async () => {
      try {
        const response = await fetch('/api/user/timezone');
        if (response.ok) {
          const data = await response.json();
          const userTimezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          setCurrentTimezone(userTimezone);
          setSelectedTimezone(userTimezone);
        }
      } catch (error) {
        console.error('Error fetching timezone:', error);
        // Use browser timezone as fallback
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setCurrentTimezone(browserTimezone);
        setSelectedTimezone(browserTimezone);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentTimezone();
  }, []);

  const handleSaveTimezone = async () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/user/timezone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timezone: selectedTimezone,
          }),
        });

        if (response.ok) {
          setCurrentTimezone(selectedTimezone);
          toast.success('Timezone updated successfully');
        } else {
          const error = await response.json();
          toast.error(error.message || 'Failed to update timezone');
        }
      } catch (error) {
        console.error('Error updating timezone:', error);
        toast.error('Failed to update timezone');
      }
    });
  };

  const isChanged = selectedTimezone !== currentTimezone;

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="space-y-4">
      {isPending && <LoadingOverlay />}
      
      <div className="space-y-2">
        <Label htmlFor="timezone">
          <Trans i18nKey="account:timezone" defaults="Timezone" />
        </Label>
        <Select
          value={selectedTimezone}
          onValueChange={setSelectedTimezone}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONE_OPTIONS.map((timezone) => (
              <SelectItem key={timezone.value} value={timezone.value}>
                {timezone.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          <Trans 
            i18nKey="account:timezoneDescription" 
            defaults="This timezone will be used for scheduling meetings and displaying dates." 
          />
        </p>
      </div>

      {isChanged && (
        <Button 
          onClick={handleSaveTimezone}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <Trans i18nKey="common:save" defaults="Save" />
        </Button>
      )}
    </div>
  );
} 
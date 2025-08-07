'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Clock, MapPin } from 'lucide-react';
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@kit/ui/dialog';

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)', popular: true },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)', popular: true },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)', popular: true },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)', popular: true },
  { value: 'America/Phoenix', label: 'Arizona (MST)', popular: false },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)', popular: false },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', popular: false },
  { value: 'Europe/London', label: 'London (GMT/BST)', popular: true },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)', popular: true },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', popular: false },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', popular: false },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', popular: false },
  { value: 'Asia/Tokyo', label: 'Japan (JST)', popular: true },
  { value: 'Asia/Shanghai', label: 'China (CST)', popular: true },
  { value: 'Asia/Kolkata', label: 'India (IST)', popular: true },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)', popular: true },
  { value: 'UTC', label: 'UTC', popular: false },
];

const POPULAR_TIMEZONES = TIMEZONE_OPTIONS.filter(tz => tz.popular);
const OTHER_TIMEZONES = TIMEZONE_OPTIONS.filter(tz => !tz.popular);

interface TimezoneWelcomeModalProps {
  userId: string;
}

export function TimezoneWelcomeModal({ userId }: TimezoneWelcomeModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Check if this is a first login and user needs to set timezone
  useEffect(() => {
    const isFirstLogin = searchParams.get('first_login') === 'true';
    const hasSkippedTimezone = localStorage.getItem('timezone_welcome_shown') === 'true';
    
    if (isFirstLogin && !hasSkippedTimezone) {
      // Check if user already has timezone set
      checkUserTimezone();
    } else if (!hasSkippedTimezone) {
      // For existing users, check periodically if they haven't set timezone
      const hasShownRecently = localStorage.getItem('timezone_check_shown') === 'true';
      if (!hasShownRecently) {
        setTimeout(() => {
          checkUserTimezone();
        }, 2000); // Check after 2 seconds for existing users
        localStorage.setItem('timezone_check_shown', 'true');
      }
    }
  }, [searchParams]);

  const checkUserTimezone = async () => {
    try {
      const response = await fetch('/api/user/timezone');
      if (response.ok) {
        const data = await response.json();
        if (!data.timezone) {
          // User doesn't have timezone set, show modal
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking user timezone:', error);
      // Show modal as fallback
      setShowModal(true);
    }
  };

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
          setShowModal(false);
          localStorage.setItem('timezone_welcome_shown', 'true');
          localStorage.setItem('timezone_check_shown', 'true');
          
          // Clean up the first_login parameter from URL
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('first_login');
          window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search);
          
          toast.success('🌍 Timezone set successfully! Meeting times will now be accurate.');
        } else {
          const error = await response.json();
          toast.error(error.message || 'Failed to save timezone');
        }
      } catch (error) {
        console.error('Error saving timezone:', error);
        toast.error('Failed to save timezone');
      }
    });
  };

  const handleSkip = () => {
    setShowModal(false);
    localStorage.setItem('timezone_welcome_shown', 'true');
    localStorage.setItem('timezone_check_shown', 'true');
    
    // Clean up the first_login parameter from URL
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('first_login');
    window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search);
    
    toast.info('You can set your timezone later in Settings → Personal Account');
  };

  if (!showModal) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Welcome to Vellora! 
          </DialogTitle>
          <DialogDescription>
            Let's set your timezone to ensure accurate meeting scheduling and calendar events.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Your Timezone
            </Label>
            
            {/* Popular Timezones */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Popular Timezones</div>
              <Select
                value={POPULAR_TIMEZONES.some(tz => tz.value === selectedTimezone) ? selectedTimezone : ''}
                onValueChange={(value) => {
                  if (value) setSelectedTimezone(value);
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Other Timezones */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Other Timezones</div>
              <Select
                value={OTHER_TIMEZONES.some(tz => tz.value === selectedTimezone) ? selectedTimezone : ''}
                onValueChange={(value) => {
                  if (value) setSelectedTimezone(value);
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="More timezones..." />
                </SelectTrigger>
                <SelectContent>
                  {OTHER_TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSaveTimezone}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? 'Saving...' : 'Save Timezone'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isPending}
            >
              Skip for now
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            This ensures your meetings are scheduled at the correct time in your local timezone.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
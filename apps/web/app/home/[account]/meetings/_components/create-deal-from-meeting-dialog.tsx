'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { createDealFromMeetingAction } from '../_lib/actions/create-deal-from-meeting.actions';

const createDealSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactEmail: z.string().email('Valid email is required').optional().or(z.literal('')),
  dealValue: z.number().min(0, 'Deal value must be positive').optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
});

type CreateDealFormData = z.infer<typeof createDealSchema>;

interface CreateDealFromMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    title: string;
    participant_emails: string[];
    host_email?: string;
    start_time?: string;
  };
  accountId: string;
  accountName: string;
  onDealCreated?: () => void;
}

const industries = [
  'Software & Technology',
  'Healthcare',
  'Financial Services',
  'Manufacturing',
  'Retail & E-commerce',
  'Education',
  'Real Estate',
  'Consulting',
  'Media & Entertainment',
  'Other',
];

export function CreateDealFromMeetingDialog({
  isOpen,
  onClose,
  meeting,
  accountId,
  accountName,
  onDealCreated,
}: CreateDealFromMeetingDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Extract suggested values from meeting
  const suggestedContactEmail = meeting.participant_emails?.find(
    (email) => email !== meeting.host_email
  ) || meeting.participant_emails?.[0] || '';

  const suggestedCompanyName = meeting.title
    ?.replace(/meeting with|call with|demo|sync/gi, '')
    .trim() || 'New Company';

  const form = useForm<CreateDealFormData>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      companyName: suggestedCompanyName,
      contactEmail: suggestedContactEmail,
      dealValue: 10000,
      industry: 'Software & Technology',
      description: `Deal created from meeting: ${meeting.title}`,
    },
  });

  const onSubmit = (data: CreateDealFormData) => {
    startTransition(async () => {
      try {
        const result = await createDealFromMeetingAction({
          meetingId: meeting.id,
          accountId,
          accountName,
          companyName: data.companyName,
          contactEmail: data.contactEmail || undefined,
          dealValue: data.dealValue,
          industry: data.industry,
          description: data.description,
        });

        if (result.success) {
          toast.success(result.message || 'Deal created successfully!');
          onDealCreated?.();
          onClose();
          form.reset();
        } else {
          toast.error(result.error || 'Failed to create deal');
        }
      } catch (error) {
        console.error('Error creating deal:', error);
        toast.error('Failed to create deal');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Deal from Meeting</DialogTitle>
          <DialogDescription>
            Convert "{meeting.title}" into a sales opportunity
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Contact Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dealValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Deal Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="10000"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the opportunity..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 
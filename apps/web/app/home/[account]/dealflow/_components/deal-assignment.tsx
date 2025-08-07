'use client';

import { useState, useEffect } from 'react';
import { User, UserPlus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { toast } from 'sonner';

interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: string;
}

interface DealAssignmentProps {
  dealId: string;
  currentAssignedTo?: string;
  accountSlug: string;
  onAssignmentChange?: (newAssignedTo: string | null) => void;
  className?: string;
  variant?: 'dropdown' | 'badge' | 'inline';
  showLabel?: boolean;
}

export function DealAssignment({
  dealId,
  currentAssignedTo,
  accountSlug,
  onAssignmentChange,
  className = '',
  variant = 'dropdown',
  showLabel = true,
}: DealAssignmentProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(currentAssignedTo);

  // Load team members on component mount
  useEffect(() => {
    loadTeamMembers();
  }, [accountSlug]);

  // Update selected user when prop changes
  useEffect(() => {
    setSelectedUserId(currentAssignedTo);
  }, [currentAssignedTo]);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/deals/team-members?accountSlug=${accountSlug}`);
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.members);
      } else {
        toast.error('Failed to load team members');
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDeal = async (newAssignedTo: string | null) => {
    setAssigning(true);
    try {
      const response = await fetch('/api/deals/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId,
          assignedTo: newAssignedTo,
          accountSlug,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedUserId(newAssignedTo || undefined);
        onAssignmentChange?.(newAssignedTo);
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Failed to assign deal');
      }
    } catch (error) {
      console.error('Error assigning deal:', error);
      toast.error('Failed to assign deal');
    } finally {
      setAssigning(false);
    }
  };

  const currentAssignee = teamMembers.find(member => member.userId === selectedUserId);

  // Badge variant - shows current assignment as a badge
  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && <span className="text-sm text-muted-foreground">Assigned:</span>}
        {currentAssignee ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {currentAssignee.name}
          </Badge>
        ) : (
          <Badge variant="outline" className="flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            Unassigned
          </Badge>
        )}
      </div>
    );
  }

  // Inline variant - shows assignment with quick action buttons
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {currentAssignee ? (
          <>
            <span className="text-sm">
              Assigned to <strong>{currentAssignee.name}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAssignDeal(null)}
              disabled={assigning}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Not assigned</span>
        )}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <label className="text-sm font-medium">Assign to team member</label>
      )}
      
      <div className="flex items-center gap-2">
        <Select
          value={selectedUserId || 'unassigned'}
          onValueChange={(value) => {
            const newAssignedTo = value === 'unassigned' ? null : value;
            handleAssignDeal(newAssignedTo);
          }}
          disabled={loading || assigning}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "Loading..." : "Select team member"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Unassigned
              </div>
            </SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {assigning && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        )}
      </div>
    </div>
  );
} 
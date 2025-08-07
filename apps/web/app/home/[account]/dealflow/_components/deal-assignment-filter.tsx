'use client';

import { useState, useEffect } from 'react';
import { Filter, User, UserPlus, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';

interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: string;
}

type AssignmentFilter = 'all' | 'assigned' | 'unassigned' | 'mine' | string; // string for specific user ID

interface DealAssignmentFilterProps {
  accountSlug: string;
  currentUserId?: string;
  onFilterChange: (filter: AssignmentFilter) => void;
  className?: string;
}

export function DealAssignmentFilter({
  accountSlug,
  currentUserId,
  onFilterChange,
  className = '',
}: DealAssignmentFilterProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<AssignmentFilter>('all');

  useEffect(() => {
    loadTeamMembers();
  }, [accountSlug]);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/deals/team-members?accountSlug=${accountSlug}`);
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.members);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value as AssignmentFilter);
    onFilterChange(value as AssignmentFilter);
  };

  const getFilterLabel = (filter: AssignmentFilter) => {
    switch (filter) {
      case 'all':
        return 'All Deals';
      case 'assigned':
        return 'Assigned';
      case 'unassigned':
        return 'Unassigned';
      case 'mine':
        return 'Assigned to Me';
      default:
        const member = teamMembers.find(m => m.userId === filter);
        return member ? `Assigned to ${member.name}` : 'Unknown';
    }
  };

  const getFilterIcon = (filter: AssignmentFilter) => {
    switch (filter) {
      case 'all':
        return <Users className="w-4 h-4" />;
      case 'assigned':
        return <User className="w-4 h-4" />;
      case 'unassigned':
        return <UserPlus className="w-4 h-4" />;
      case 'mine':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Filter className="w-4 h-4 text-muted-foreground" />
      
      <Select
        value={selectedFilter}
        onValueChange={handleFilterChange}
        disabled={loading}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by assignment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Deals
            </div>
          </SelectItem>
          
          {currentUserId && (
            <SelectItem value="mine">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Assigned to Me
              </div>
            </SelectItem>
          )}
          
          <SelectItem value="assigned">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Assigned
            </div>
          </SelectItem>
          
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Unassigned
            </div>
          </SelectItem>

          {teamMembers.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                Team Members
              </div>
              {teamMembers.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span>{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.role}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {selectedFilter !== 'all' && (
        <Badge variant="secondary" className="flex items-center gap-1">
          {getFilterIcon(selectedFilter)}
          {getFilterLabel(selectedFilter)}
        </Badge>
      )}

      {selectedFilter !== 'all' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFilterChange('all')}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear Filter
        </Button>
      )}
    </div>
  );
}

// Helper function to filter deals based on assignment
export function filterDealsByAssignment(
  deals: any[],
  filter: AssignmentFilter,
  currentUserId?: string
) {
  if (filter === 'all') return deals;
  
  return deals.filter(deal => {
    switch (filter) {
      case 'assigned':
        return deal.assigned_to != null;
      case 'unassigned':
        return deal.assigned_to == null;
      case 'mine':
        return deal.assigned_to === currentUserId;
      default:
        // Specific user ID
        return deal.assigned_to === filter;
    }
  });
} 
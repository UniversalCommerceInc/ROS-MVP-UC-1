'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

interface EditStagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stageNames: Record<string, string>) => void;
  currentStageNames: Record<string, string>;
}

type StageKey = 'interested' | 'contacted' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost';

const DEFAULT_STAGES: Record<StageKey, string> = {
  interested: 'Interested',
  contacted: 'Contacted',
  demo: 'Demo',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Closed Won',
  lost: 'Closed Lost',
};

export function EditStagesModal({
  isOpen,
  onClose,
  onSave,
  currentStageNames,
}: EditStagesModalProps) {
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize with current custom names or default names
    const initialNames = { ...DEFAULT_STAGES };
    (Object.keys(DEFAULT_STAGES) as StageKey[]).forEach((stage) => {
      if (currentStageNames[stage]) {
        initialNames[stage] = currentStageNames[stage];
      }
    });
    setEditedNames(initialNames);
  }, [currentStageNames, isOpen]);

  const handleSave = () => {
    // Only save the names that are different from default
    const customNames: Record<string, string> = {};
    (Object.keys(editedNames) as StageKey[]).forEach((stage) => {
      if (editedNames[stage] !== DEFAULT_STAGES[stage] && editedNames[stage]) {
        customNames[stage] = editedNames[stage];
      }
    });
    onSave(customNames);
    onClose();
  };

  const handleReset = () => {
    setEditedNames({ ...DEFAULT_STAGES });
  };

  const handleInputChange = (stage: string, value: string) => {
    setEditedNames((prev) => ({
      ...prev,
      [stage]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Pipeline Stages</DialogTitle>
          <DialogDescription className="text-gray-400">
            Customize the names of your pipeline stages to match your sales process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.entries(DEFAULT_STAGES).map(([stage, defaultName]) => (
            <div key={stage} className="space-y-2">
              <Label htmlFor={stage} className="text-sm font-medium text-gray-300">
                {defaultName} Stage
              </Label>
              <Input
                id={stage}
                value={editedNames[stage] || ''}
                onChange={(e) => handleInputChange(stage, e.target.value)}
                placeholder={defaultName}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Reset to Default
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
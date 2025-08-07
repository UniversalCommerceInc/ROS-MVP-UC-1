'use client';

import { ArrowRight, FileText, X, Zap } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

interface HubSpotImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDeals: () => void;
}

export default function HubSpotImportModal({
  isOpen,
  onClose,
  onImportDeals,
}: HubSpotImportModalProps) {
  const handleImport = () => {
    onImportDeals();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-4 m-auto max-h-[calc(100vh-3rem)] max-w-lg rounded-xl border-purple-700/30 bg-[#1C122F] p-0 pb-[25%] text-white shadow-2xl">
        <DialogTitle>Import from HubSpot</DialogTitle>
        <DialogHeader className="p-6 pb-0">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-white/10 p-3">
              <FileText className="h-6 w-6 text-purple-400" />
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <p className="mt-1 mb-6 text-center text-sm text-white/70">
            Kickstart your DealFlow by importing your existing deals.
          </p>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6">
          <div className="text-center">
            <p className="text-md mb-2 font-medium">
              Connect your HubSpot account to seamlessly sync your pipeline and
              get an instant momentum boost!
            </p>
            <Button
              variant="ghost"
              className="w-full rounded-lg bg-purple-600/20 px-4 py-2 text-purple-300 hover:bg-purple-600/30 sm:w-auto"
            >
              <Zap className="mr-2 h-4 w-4" /> Unlock Your Deals
            </Button>
          </div>

          <p className="text-center text-xs text-white/60">
            This process is secure and only reads your deal data. We do not
            store your HubSpot credentials. You can disconnect at any time from
            the settings page.
          </p>

          <div className="rounded-lg bg-black/30 p-4">
            <h3 className="mb-2 text-sm font-semibold">How it works:</h3>
            <ol className="list-inside list-decimal space-y-1 text-xs text-white/70">
              <li>Click &apos;Import Deals&apos; below.</li>
              <li>
                You&apos;ll be redirected to HubSpot to authorize VELLORA.AI.
              </li>
              <li>
                Grant the necessary permissions (typically read-access to deals,
                contacts, and companies).
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex flex-col space-y-3 rounded-b-xl bg-black/20 p-6 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-3">
          <Button
            variant="outline"
            className="w-full border-gray-700 bg-black/50 text-white hover:bg-black/70 sm:w-auto"
            onClick={onClose}
          >
            Skip for Now
          </Button>
          <Button
            className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
            onClick={handleImport}
          >
            Import Deals <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

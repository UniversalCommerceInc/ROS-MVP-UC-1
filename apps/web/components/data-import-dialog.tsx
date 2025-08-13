'use client';

import React, { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';

/**
 * Interface for deal data structure (matches our transformed deals)
 */
interface Deal {
  id: string;
  deal_title?: string | null;
  value_amount?: number | null;
  value_currency?: string | null;
  stage_name?: string | null; // This is added for UI display
  stage?: string | null; // This is the actual enum value
  account_id?: string | null;
  close_date?: string | null;
  created_at?: string | null;
  company_name?: string | null;
  next_action?: string | null;
}

interface DataImportDialogProps {
  deals: Deal[];
  duplicateCheckResult?: {
    existingDeals: Deal[];
    newDeals: Deal[];
    duplicateInfo: Array<{
      importDeal: Deal;
      existingDeal: any;
      reason: string;
    }>;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onImport: (selectedDeals: Deal[]) => void;
}

/**
 * Color mapping for different deal stages using MakerKit theme
 */
const stageColors = {
  Interested:
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
  Contacted:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800',
  Demo: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800',
  Proposal:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800',
  Negotiation:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800',
  Won: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800',
  Lost: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800',
};

const DataImportDialog: React.FC<DataImportDialogProps> = ({
  deals,
  duplicateCheckResult,
  isOpen,
  onClose,
  onImport,
}) => {
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'category'>('all');
  const [duplicateToastShown, setDuplicateToastShown] = useState(false); // Add this flag
  const [lastDuplicateCount, setLastDuplicateCount] = useState(0); // Track duplicate count
  const toastShownRef = useRef(false); // Ref to prevent double calls

  // Group deals by stage for category view
  const dealsByStage = deals.reduce(
    (acc, deal) => {
      const stageName = deal.stage_name || 'Lead';
      if (!acc[stageName]) {
        acc[stageName] = [];
      }
      acc[stageName].push(deal);
      return acc;
    },
    {} as Record<string, Deal[]>,
  );

  // Show duplicate toast when dialog opens if duplicates found (only once per session)
  useEffect(() => {
    const duplicateCount = duplicateCheckResult?.existingDeals.length || 0;

    if (isOpen && duplicateCount > 0 && !toastShownRef.current) {
      // Mark as shown immediately to prevent double calls
      toastShownRef.current = true;

      toast.warning(
        `${duplicateCount} duplicate deal${duplicateCount > 1 ? 's' : ''} found`,
        {
          description: `These deals already exist in your system and have been excluded from selection. You can manually select them if needed.`,
          duration: 5000,
        },
      );

      setDuplicateToastShown(true);
      setLastDuplicateCount(duplicateCount);
    }
  }, [isOpen, duplicateCheckResult?.existingDeals.length]);

  // Reset duplicate toast flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDuplicateToastShown(false);
      setLastDuplicateCount(0);
      toastShownRef.current = false; // Reset ref
    }
  }, [isOpen]);

  // Initialize selection - exclude existing deals by default
  useEffect(() => {
    if (deals.length > 0) {
      console.log('🔄 Initializing dialog with deals:', deals.length);

      let initialSelectedDeals: Set<string>;
      let initialSelectedStages: Set<string>;

      if (
        duplicateCheckResult &&
        duplicateCheckResult.existingDeals.length > 0
      ) {
        // Only select new deals by default, exclude duplicates
        const newDealIds = new Set(
          duplicateCheckResult.newDeals.map((deal) => deal.id),
        );
        initialSelectedDeals = newDealIds;

        // Group new deals by stage
        const newDealsByStage = duplicateCheckResult.newDeals.reduce(
          (acc, deal) => {
            const stageName = deal.stage_name || 'Lead';
            if (!acc[stageName]) {
              acc[stageName] = [];
            }
            acc[stageName].push(deal);
            return acc;
          },
          {} as Record<string, Deal[]>,
        );

        initialSelectedStages = new Set(Object.keys(newDealsByStage));

        console.log(
          `📋 Excluding ${duplicateCheckResult.existingDeals.length} existing deals from initial selection`,
        );
      } else {
        // No duplicates found, select all deals
        const allDealIds = new Set(deals.map((deal) => deal.id));
        const allStages = new Set(Object.keys(dealsByStage));
        initialSelectedDeals = allDealIds;
        initialSelectedStages = allStages;
      }

      setSelectedDeals(initialSelectedDeals);
      setSelectedStages(initialSelectedStages);

      console.log(
        `📋 Initialized selection: ${initialSelectedDeals.size} deals, ${initialSelectedStages.size} stages`,
      );
    }
  }, [deals.length, duplicateCheckResult]);

  /**
   * Check if a deal is a duplicate
   */
  const isDuplicateDeal = (dealId: string): boolean => {
    return (
      duplicateCheckResult?.existingDeals.some((d) => d.id === dealId) || false
    );
  };

  /**
   * Get duplicate info for a specific deal
   */
  const getDuplicateInfo = (dealId: string) => {
    return duplicateCheckResult?.duplicateInfo.find(
      (info) => info.importDeal.id === dealId,
    );
  };

  /**
   * Toggle selection of individual deal
   */
  const handleDealToggle = (dealId: string) => {
    console.log('🔄 Toggling deal:', dealId);

    const newSelected = new Set(selectedDeals);
    const deal = deals.find((d) => d.id === dealId);
    const stageName = deal?.stage_name || 'Lead';

    if (newSelected.has(dealId)) {
      // Deselecting - no toast needed, this is safe
      newSelected.delete(dealId);
      console.log(`❌ Deselected deal: ${dealId}`);
    } else {
      // Selecting - only show warning if it's a duplicate
      newSelected.add(dealId);
      console.log(`✅ Selected deal: ${dealId}`);

      // Check if this is a duplicate deal and show friendly warning
      if (isDuplicateDeal(dealId)) {
        const duplicateInfo = getDuplicateInfo(dealId);
        toast.warning('Selecting Duplicate Deal', {
          description: `"${deal?.deal_title || 'Untitled'}" at ${deal?.company_name || 'Unknown'} already exists in your system. You can still select it if needed.`,
          duration: 3000,
        });
      }
    }

    setSelectedDeals(newSelected);

    // Update stage selection based on remaining deals in this stage
    const stageDeals = dealsByStage[stageName] || [];
    const selectedStageDeals = stageDeals.filter((d) => newSelected.has(d.id));

    setSelectedStages((prev) => {
      const newStages = new Set(prev);
      if (selectedStageDeals.length === 0) {
        newStages.delete(stageName);
      } else if (selectedStageDeals.length === stageDeals.length) {
        newStages.add(stageName);
      }
      return newStages;
    });
  };

  /**
   * Toggle selection of entire stage
   */
  const handleStageToggle = (stageName: string) => {
    console.log('🔄 Toggling stage:', stageName);

    const stageDeals = dealsByStage[stageName] || [];
    const isStageSelected = selectedStages.has(stageName);

    // Check if stage contains duplicates
    const duplicatesInStage = stageDeals.filter((deal) =>
      isDuplicateDeal(deal.id),
    );
    if (duplicatesInStage.length > 0 && !isStageSelected) {
      toast.warning('Stage contains duplicates', {
        description: `${duplicatesInStage.length} duplicate deal${duplicatesInStage.length > 1 ? 's' : ''} in "${stageName}" stage will be selected. These deals already exist in your system.`,
        duration: 4000,
      });
    }

    setSelectedDeals((prev) => {
      const newSelected = new Set(prev);

      if (isStageSelected) {
        // Deselect all deals in this stage
        stageDeals.forEach((deal) => {
          newSelected.delete(deal.id);
        });
        console.log(
          `❌ Deselected stage: ${stageName} (${stageDeals.length} deals)`,
        );
      } else {
        // Select all deals in this stage
        stageDeals.forEach((deal) => {
          newSelected.add(deal.id);
        });
        console.log(
          `✅ Selected stage: ${stageName} (${stageDeals.length} deals)`,
        );
      }

      return newSelected;
    });

    setSelectedStages((prev) => {
      const newStages = new Set(prev);
      if (isStageSelected) {
        newStages.delete(stageName);
      } else {
        newStages.add(stageName);
      }
      return newStages;
    });
  };

  /**
   * Select all deals and stages
   */
  const handleSelectAll = () => {
    console.log('🔄 Selecting all deals');

    // Check if there are duplicates that will be selected
    if (duplicateCheckResult && duplicateCheckResult.existingDeals.length > 0) {
      toast.warning('Selecting all deals including duplicates', {
        description: `${duplicateCheckResult.existingDeals.length} duplicate deal${duplicateCheckResult.existingDeals.length > 1 ? 's' : ''} will be selected. These deals already exist in your system.`,
        duration: 4000,
      });
    }

    const allDealIds = new Set(deals.map((deal) => deal.id));
    const allStages = new Set(Object.keys(dealsByStage));

    setSelectedDeals(allDealIds);
    setSelectedStages(allStages);

    console.log(
      `✅ Selected all: ${allDealIds.size} deals, ${allStages.size} stages`,
    );
  };

  /**
   * Deselect all deals and stages
   */
  const handleDeselectAll = () => {
    console.log('🔄 Deselecting all deals');

    setSelectedDeals(new Set());
    setSelectedStages(new Set());

    console.log('❌ Deselected all deals and stages');
  };

  /**
   * Handle import button click
   */
  const handleImport = async () => {
    const selectedDealsArray = deals.filter((deal) =>
      selectedDeals.has(deal.id),
    );

    // Check if any selected deals are duplicates
    const duplicateDeals = selectedDealsArray.filter((deal) =>
      isDuplicateDeal(deal.id),
    );

    if (duplicateDeals.length > 0) {
      // Show toast warning about duplicates and don't proceed with import
      toast.warning(
        `Cannot import ${duplicateDeals.length} duplicate deal${duplicateDeals.length > 1 ? 's' : ''}`,
        {
          description: `Please uncheck the duplicate deal${duplicateDeals.length > 1 ? 's' : ''} before importing. These deals already exist in your system.`,
          duration: 6000,
          action: {
            label: 'Uncheck Duplicates',
            onClick: () => {
              // Auto-uncheck duplicate deals
              const duplicateIds = new Set(duplicateDeals.map((d) => d.id));

              setSelectedDeals((prev) => {
                const newSet = new Set(prev);
                duplicateIds.forEach((id) => newSet.delete(id));
                return newSet;
              });

              // Update stage selections properly
              setSelectedStages((prev) => {
                const newStages = new Set<string>();

                // Check each stage to see if it should remain selected
                Object.entries(dealsByStage).forEach(
                  ([stageName, stageDeals]) => {
                    const nonDuplicateDealsInStage = stageDeals.filter(
                      (d) => !duplicateIds.has(d.id),
                    );
                    const selectedNonDuplicateDealsInStage = stageDeals.filter(
                      (d) => selectedDeals.has(d.id) && !duplicateIds.has(d.id),
                    );

                    // If all non-duplicate deals in this stage are selected, keep stage selected
                    if (
                      nonDuplicateDealsInStage.length > 0 &&
                      selectedNonDuplicateDealsInStage.length ===
                        nonDuplicateDealsInStage.length
                    ) {
                      newStages.add(stageName);
                    }
                  },
                );

                return newStages;
              });

              toast.success('Duplicate deals unchecked', {
                description:
                  'You can now proceed with importing the remaining deals.',
                duration: 3000,
              });
            },
          },
        },
      );
      return; // Don't proceed with import
    }

    setIsImporting(true);
    console.log(`💾 Starting import of ${selectedDealsArray.length} deals...`);

    try {
      await onImport(selectedDealsArray);
    } catch (error) {
      console.error('💥 Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Format currency values for display
   */
  const formatCurrency = (
    value: number | null | undefined,
    currency: string | null | undefined,
  ) => {
    if (!value) return '$0';

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    });
    return formatter.format(value);
  };

  /**
   * Format dates for display
   */
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Don't render if dialog is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background flex h-[95vh] max-h-[95vh] w-full max-w-6xl flex-col rounded-lg border shadow-lg">
        {/* Header */}
        <div className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-xl font-semibold">
                Import Your CRM Data
              </h2>
              <p className="text-muted-foreground text-sm">
                Review and select deals to import into your system
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </div>

        {/* Stats and Controls */}
        <div className="bg-muted/50 flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Statistics */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">Total:</span>
                <span className="text-foreground text-lg font-semibold">
                  {deals.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">Selected:</span>
                <span className="text-primary text-lg font-semibold">
                  {selectedDeals.size}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">
                  Total Value:
                </span>
                <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(
                    deals
                      .filter((deal) => selectedDeals.has(deal.id))
                      .reduce((sum, deal) => sum + (deal.value_amount || 0), 0),
                    'USD',
                  )}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3">
              {/* View mode toggle */}
              <div className="flex rounded-md border p-1">
                <Button
                  variant={viewMode === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('all')}
                  className="h-8 px-3"
                >
                  All Deals
                </Button>
                <Button
                  variant={viewMode === 'category' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('category')}
                  className="h-8 px-3"
                >
                  By Stages
                </Button>
              </div>

              {/* Selection controls */}
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="sm"
                disabled={selectedDeals.size === deals.length}
                className="h-8 px-3"
              >
                {selectedDeals.size === deals.length
                  ? 'All Selected'
                  : 'Select All'}
              </Button>
              <Button
                onClick={handleDeselectAll}
                variant="outline"
                size="sm"
                disabled={selectedDeals.size === 0}
                className="h-8 px-3"
              >
                {selectedDeals.size === 0 ? 'None Selected' : 'Deselect All'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {viewMode === 'category' ? (
            // Category view - grouped by stages
            <div className="space-y-6">
              {Object.entries(dealsByStage).map(([stageName, stageDeals]) => (
                <Card key={stageName}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedStages.has(stageName)}
                          onCheckedChange={(checked) => {
                            console.log(
                              'Stage checkbox changed:',
                              stageName,
                              checked,
                            );
                            handleStageToggle(stageName);
                          }}
                        />
                        <CardTitle className="text-lg">{stageName}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={
                            stageColors[
                              stageName as keyof typeof stageColors
                            ] || stageColors.Interested
                          }
                        >
                          {stageDeals.length} deals
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {formatCurrency(
                          stageDeals.reduce(
                            (sum, deal) => sum + (deal.value_amount || 0),
                            0,
                          ),
                          stageDeals[0]?.value_currency || 'USD',
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {stageDeals.map((deal) => {
                        const isDuplicate = isDuplicateDeal(deal.id);
                        return (
                          <div
                            key={deal.id}
                            className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
                              selectedDeals.has(deal.id)
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : isDuplicate
                                  ? 'border-orange-300 bg-orange-50/50 dark:border-orange-600 dark:bg-orange-900/10'
                                  : 'border-border hover:border-primary/50'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleDealToggle(deal.id);
                            }}
                          >
                            <div className="mb-3 flex items-start justify-between">
                              <Checkbox
                                checked={selectedDeals.has(deal.id)}
                                onCheckedChange={(checked) => {
                                  console.log(
                                    'Checkbox changed:',
                                    deal.id,
                                    checked,
                                  );
                                  handleDealToggle(deal.id);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              />
                              {isDuplicate && (
                                <Badge
                                  variant="outline"
                                  className="border-orange-300 bg-orange-100 text-xs text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                                >
                                  Duplicate
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-foreground line-clamp-2 font-medium">
                                {deal.deal_title || 'Untitled Deal'}
                              </h4>
                              <div className="text-muted-foreground space-y-1 text-sm">
                                <div>
                                  <span className="font-medium">Company:</span>{' '}
                                  {deal.company_name || 'Unknown'}
                                </div>
                                <div>
                                  <span className="font-medium">Value:</span>{' '}
                                  <span className="text-green-600 dark:text-green-400">
                                    {formatCurrency(
                                      deal.value_amount,
                                      deal.value_currency,
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Close Date:
                                  </span>{' '}
                                  {formatDate(deal.close_date)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // All deals view - grid layout
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deals.map((deal) => {
                const isDuplicate = isDuplicateDeal(deal.id);
                return (
                  <Card
                    key={deal.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedDeals.has(deal.id)
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : isDuplicate
                          ? 'border-orange-300 bg-orange-50/50 dark:border-orange-600 dark:bg-orange-900/10'
                          : 'hover:border-primary/50'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDealToggle(deal.id);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <Checkbox
                          checked={selectedDeals.has(deal.id)}
                          onCheckedChange={(checked) => {
                            console.log('Checkbox changed:', deal.id, checked);
                            handleDealToggle(deal.id);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        />
                        <div className="flex flex-col items-end space-y-1">
                          <Badge
                            variant="secondary"
                            className={
                              stageColors[
                                (deal.stage_name as keyof typeof stageColors) ||
                                  'Lead'
                              ]
                            }
                          >
                            {deal.stage_name || 'Lead'}
                          </Badge>
                          {isDuplicate && (
                            <Badge
                              variant="outline"
                              className="border-orange-300 bg-orange-100 text-xs text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                            >
                              Duplicate
                            </Badge>
                          )}
                        </div>
                      </div>

                      <h4 className="text-foreground mb-3 line-clamp-2 font-medium">
                        {deal.deal_title || 'Untitled Deal'}
                      </h4>

                      <div className="text-muted-foreground space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Company:</span>
                          <span className="text-foreground ml-2 truncate font-medium">
                            {deal.company_name || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Value:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(
                              deal.value_amount,
                              deal.value_currency,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Close Date:</span>
                          <span className="text-foreground font-medium">
                            {formatDate(deal.close_date)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span className="text-foreground font-medium">
                            {formatDate(deal.created_at)}
                          </span>
                        </div>
                      </div>

                      {deal.next_action && (
                        <p className="text-muted-foreground mt-3 line-clamp-2 text-xs">
                          <span className="font-medium">Next:</span>{' '}
                          {deal.next_action}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/50 flex-shrink-0 border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              {selectedDeals.size} of {deals.length} deals selected
              {selectedDeals.size > 0 && (
                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                  (Total Value:{' '}
                  {formatCurrency(
                    deals
                      .filter((deal) => selectedDeals.has(deal.id))
                      .reduce((sum, deal) => sum + (deal.value_amount || 0), 0),
                    'USD',
                  )}
                  )
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedDeals.size === 0 || isImporting}
                className="relative"
              >
                {isImporting ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Importing...
                  </div>
                ) : (
                  `Import ${selectedDeals.size} Deals`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportDialog;

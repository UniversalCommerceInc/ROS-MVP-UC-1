'use client';

import React, { Suspense, useEffect, useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

import DataImportDialog from '~/components/data-import-dialog';
import {
  TransformResult,
  insertTransformedData,
  transformDeals,
} from '~/lib/utils/dataTransform';

interface ImportPageProps {
  params: Promise<{ crm: string }>;
}

function ImportContent({ platform }: { platform: string }) {
  const searchParams = useSearchParams();
  const params = useParams();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [transformedData, setTransformedData] = useState<TransformResult>({
    deals: [],
    dealContacts: [],
  });
  const [supabase, setSupabase] = useState<any>(null);
  const account = params.account as string;

  // Platform-specific configurations
  const platformConfig = {
    salesforce: {
      name: 'Salesforce',
      color: 'bg-blue-500',
      icon: '⚡',
      loadingMessage: 'Importing your Salesforce opportunities...',
    },
    hubspot: {
      name: 'HubSpot',
      color: 'bg-orange-500',
      icon: '🧡',
      loadingMessage: 'Importing your HubSpot deals...',
    },
    pipedrive: {
      name: 'Pipedrive',
      color: 'bg-green-500',
      icon: '🚀',
      loadingMessage: 'Importing your Pipedrive deals...',
    },
    zoho: {
      name: 'Zoho CRM',
      color: 'bg-red-500',
      icon: '🔥',
      loadingMessage: 'Importing your Zoho deals...',
    },
  };

  const config = platformConfig[platform as keyof typeof platformConfig] || {
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    color: 'bg-blue-500',
    icon: '📊',
    loadingMessage: `Importing your ${platform} data...`,
  };

  // Initialize Supabase client
  useEffect(() => {
    const initSupabase = () => {
      const client = getSupabaseBrowserClient();
      setSupabase(client);
    };
    initSupabase();
  }, []);

  useEffect(() => {
    const handleImport = async () => {
      try {
        console.log(`🔄 Processing ${platform} import...`);

        const connected = searchParams.get('connected');
        const userId = searchParams.get('user_id');
        const error = searchParams.get('error');

        // Handle errors first
        if (error) {
          throw new Error(decodeURIComponent(error));
        }

        if (!platform) {
          throw new Error('Platform parameter missing');
        }

        // For connected users, fetch data using stored tokens
        if (connected === 'true' && userId) {
          console.log(`✅ User connected to ${platform}, fetching data...`);

          const dataResponse = await fetch(`/api/crm/${platform}/fetch-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
            }),
          });

          if (!dataResponse.ok) {
            const errorData = await dataResponse.json();
            throw new Error(
              errorData.error || `Failed to fetch ${platform} data`,
            );
          }

          const apiData = await dataResponse.json();
          console.log('📊 Data received:', {
            dealCount: apiData.data?.length || 0,
            accountId: apiData.accountId,
            platform: platform,
          });

          // Handle empty data
          if (!apiData.data || apiData.data.length === 0) {
            console.log('📝 No deals found');
            setTransformedData({ deals: [], dealContacts: [] });
          } else {
            // Transform data using the returned accountId
            console.log(
              `🔄 Transforming ${apiData.data.length} ${platform} deals...`,
            );
            const transformed = transformDeals(
              apiData.data,
              platform,
              apiData.accountId,
              userId,
            );
            setTransformedData(transformed);
            console.log(
              `✅ Transformed: ${transformed.deals.length} deals, ${transformed.dealContacts.length} contacts`,
            );
          }

          setShowImportDialog(true);
          setLoading(false);
          return;
        }

        // If no connected=true, something went wrong
        throw new Error('Invalid import state - missing connection data');
      } catch (err) {
        console.error(`💥 ${platform} import error:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    // Only run import handler when we have search params and supabase client
    if (searchParams && supabase && platform) {
      handleImport();
    }
  }, [searchParams, supabase, platform]);

  /**
   * Handle user's import selection
   * @param selectedDeals - Deals selected by user for import
   */
  const handleImport = async (selectedDeals: any[]) => {
    try {
      setLoading(true);
      console.log(
        `💾 Starting import of ${selectedDeals.length} ${platform} deals...`,
      );

      // Get selected deal IDs
      const selectedDealIds = new Set(selectedDeals.map((deal) => deal.id));

      // Filter dealContacts based on selected deal IDs
      const filteredContacts = transformedData.dealContacts.filter((contact) =>
        selectedDealIds.has(contact.deal_id),
      );

      console.log(
        `📞 Including ${filteredContacts.length} contacts for selected deals`,
      );

      // Insert deals and contacts into Supabase
      await insertTransformedData(
        {
          deals: selectedDeals,
          dealContacts: filteredContacts,
        },
        supabase,
      );

      console.log('🎉 Import completed successfully!');

      // Toast success message
      toast.success(`${config.name} Data Imported Successfully!`, {
        description: `Successfully imported ${selectedDeals.length} deals and ${filteredContacts.length} contacts from ${config.name}.`,
        duration: 5000,
      });

      // Update platform connection (if applicable)
      if (selectedDeals.length > 0) {
        const accountId = selectedDeals[0]?.account_id;

        if (accountId) {
          console.log(
            `🔗 Marking ${platform} as connected for account ${accountId}`,
          );
          // Optionally update your `user_connections` table here
        }
      }

      // Clean up localStorage
      localStorage.removeItem('oauth_platform');
      localStorage.removeItem(`${platform}_oauth_state`);

      // Get account ID from multiple sources

      console.log(`🔄 Redirecting to dealflow for account: ${account}`);

      // Redirect to dealflow after a short delay
      setTimeout(() => {
        if (account) {
          router.push(
            `/home/${account}/dealflow?import=success&platform=${platform}`,
          );
        } else {
          console.error('❌ No account ID found for redirect');
          // Fallback to integrations page
          router.push(`/integrations?import=success&platform=${platform}`);
        }
      }, 1500);
    } catch (err) {
      console.error('💥 Import error:', err);

      toast.error(`${config.name} Import Failed`, {
        description:
          err instanceof Error
            ? `Failed to import ${config.name} data: ${err.message}`
            : `${config.name} import failed due to an unknown error. Please try again.`,
        duration: 5000,
      });

      setError(
        err instanceof Error
          ? `Import failed: ${err.message}`
          : 'Import failed due to an unknown error',
      );
    } finally {
      setLoading(false);
    }
  };

  // Get account ID for error redirect fallbacks
  const getAccountIdForRedirect = () => {
    return (
      transformedData.deals[0]?.account_id ||
      params?.account ||
      localStorage.getItem('current_account_id')
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${config.color}/20`}
          >
            <div className="text-3xl">{config.icon}</div>
          </div>
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            Processing Your {config.name} Data
          </h2>
          <p className="text-gray-400">{config.loadingMessage}</p>
          <p className="mt-2 text-sm text-gray-500">
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const accountId = getAccountIdForRedirect();

    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg
              className="h-8 w-8 text-red-500"
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
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            {config.name} Connection Failed
          </h2>
          <p className="mb-6 text-gray-400">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                // Clean up and try again
                localStorage.removeItem('oauth_platform');
                localStorage.removeItem(`${platform}_oauth_state`);

                // Redirect to account-specific integrations if possible
                if (accountId) {
                  router.push(`/home/${accountId}/integrations`);
                } else {
                  router.push('/integrations');
                }
              }}
              className="w-full rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                if (accountId) {
                  router.push(`/home/${accountId}/integrations`);
                } else {
                  router.push('/integrations');
                }
              }}
              className="w-full rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
            >
              Back to Integrations
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - show ready for import
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${config.color}/20`}
          >
            <div className="text-3xl">{config.icon}</div>
          </div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-8 w-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            {config.name} Data Ready for Import
          </h2>
          <p className="mb-4 text-gray-400">
            {transformedData.deals.length === 0
              ? `No deals found in your ${config.name} account, but the connection was successful.`
              : `Found ${transformedData.deals.length} deals from ${config.name} ready for import.`}
          </p>
          {transformedData.deals.length > 0 && (
            <div className="text-sm text-gray-500">
              Review and select the data you want to import into your system.
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog - Shows when we have data to import */}
      {showImportDialog && transformedData.deals.length > 0 && (
        <DataImportDialog
          deals={transformedData.deals}
          isOpen={showImportDialog}
          onClose={() => {
            setShowImportDialog(false);
            // Show info toast when user closes without importing
            toast.info(`${config.name} Import Cancelled`, {
              description: `You can always import your ${config.name} data later from the integrations page.`,
              duration: 3000,
            });

            // Redirect back to account-specific integrations
            const accountId = getAccountIdForRedirect();
            if (accountId) {
              router.push(`/home/${accountId}/integrations`);
            } else {
              router.push('/integrations');
            }
          }}
          onImport={handleImport}
        />
      )}
    </>
  );
}

/**
 * Main Import CRM Page Component
 */
async function ImportCRMPage({ params }: ImportPageProps) {
  const { crm: platform } = await params;

  // Validate platform
  const validPlatforms = ['salesforce', 'hubspot', 'pipedrive', 'zoho'];
  if (!validPlatforms.includes(platform)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            Invalid CRM Platform
          </h1>
          <p className="mt-2 text-gray-400">
            The platform "{platform}" is not supported.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Supported platforms: Salesforce, HubSpot, Pipedrive, Zoho
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Loading...
            </h2>
            <p className="text-gray-400">
              Please wait while we process your authentication...
            </p>
          </div>
        </div>
      }
    >
      <ImportContent platform={platform} />
    </Suspense>
  );
}

export default ImportCRMPage;

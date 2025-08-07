'use client';

import React, { Suspense, useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

import DataImportDialog from '~/components/data-import-dialog';
import {
  TransformResult,
  insertTransformedData,
  transformDeals,
} from '~/lib/utils/dataTransform';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [transformedData, setTransformedData] = useState<TransformResult>({
    deals: [],
    dealContacts: [],
  });
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client
  useEffect(() => {
    const initSupabase = () => {
      // getSupabaseBrowserClient() is synchronous, no need for async/await
      const client = getSupabaseBrowserClient();
      setSupabase(client);
    };
    initSupabase();
  }, []);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');

        const platform = searchParams.get('platform');
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
              // No accountId needed - backend will find it
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
          });

          // Handle empty data
          if (!apiData.data || apiData.data.length === 0) {
            console.log('📝 No deals found');
            setTransformedData({ deals: [], dealContacts: [] });
          } else {
            // Transform data using the returned accountId
            console.log(`🔄 Transforming ${apiData.data.length} deals...`);
            const transformed = transformDeals(
              apiData.data,
              platform,
              apiData.accountId, // Use dynamic accountId from response
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
        throw new Error('Invalid OAuth callback state');
      } catch (err) {
        console.error('💥 OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    // Only run callback handler when we have search params and supabase client
    if (searchParams && supabase) {
      handleCallback();
    }
  }, [searchParams, supabase, router]);

  /**
   * Handle user's import selection
   * @param selectedDeals - Deals selected by user for import
   */
  const handleImport = async (selectedDeals: any[]) => {
    try {
      setLoading(true);
      console.log(`💾 Starting import of ${selectedDeals.length} deals...`);

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
      toast.success('Data Imported Successfully!', {
        description: `Successfully imported ${selectedDeals.length} deals and ${filteredContacts.length} contacts to your database.`,
        duration: 5000,
      });

      // Update platform connection (if applicable)
      const platform =
        searchParams.get('platform') || localStorage.getItem('oauth_platform');
      if (platform && selectedDeals.length > 0) {
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
      if (platform) {
        localStorage.removeItem(`${platform}_oauth_state`);
      }

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/integrations?import=success');
      }, 1500);
    } catch (err) {
      console.error('💥 Import error:', err);

      toast.error('Import Failed', {
        description:
          err instanceof Error
            ? `Failed to import data: ${err.message}`
            : 'Import failed due to an unknown error. Please try again.',
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

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            Processing Your Data
          </h2>
          <p className="text-gray-400">
            Please wait while we fetch and prepare your CRM data...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
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
            Connection Failed
          </h2>
          <p className="mb-6 text-gray-400">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                // Clean up and try again
                localStorage.removeItem('oauth_platform');
                const platform = searchParams.get('platform');
                if (platform) {
                  localStorage.removeItem(`${platform}_oauth_state`);
                }
                router.push('/integrations');
              }}
              className="w-full rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/integrations')}
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
            Data Ready for Import
          </h2>
          <p className="mb-4 text-gray-400">
            {transformedData.deals.length === 0
              ? 'No deals found to import, but the connection was successful.'
              : `Found ${transformedData.deals.length} deals ready for import.`}
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
            toast.info('Import Cancelled', {
              description:
                'You can always import your CRM data later from the integrations page.',
              duration: 3000,
            });
            // Redirect back to integrations
            router.push('/integrations');
          }}
          onImport={handleImport}
        />
      )}
    </>
  );
}

/**
 * Main OAuth Callback Page Component
 * Wrapped with Suspense to handle client-side search params
 */
export default function OAuthCallbackPage() {
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
      <OAuthCallbackContent />
    </Suspense>
  );
}

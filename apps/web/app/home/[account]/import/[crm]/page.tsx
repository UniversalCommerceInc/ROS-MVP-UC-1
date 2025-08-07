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
    folk: {
      name: 'Folk CRM',
      color: 'bg-purple-500',
      icon: '👥',
      loadingMessage: 'Importing your Folk CRM people...',
    },
  };

  const config = platformConfig[platform as keyof typeof platformConfig] || {
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    color: 'bg-blue-500',
    icon: '📊',
    loadingMessage: `Importing your ${platform} data...`,
  };

  useEffect(() => {
    const initSupabase = () => {
      const client = getSupabaseBrowserClient();
      setSupabase(client);
    };
    initSupabase();
  }, []);

  // Updated section of the ImportContent component - just the relevant part

  useEffect(() => {
    const handleImport = async () => {
      try {
        console.log(`🔄 Processing ${platform} import...`);

        const connected = searchParams.get('connected');
        const userId = searchParams.get('user_id');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(decodeURIComponent(error));
        }

        if (!platform) {
          throw new Error('Platform parameter missing');
        }

        if (connected === 'true') {
          console.log(`✅ User connected to ${platform}, fetching data...`);

          // Get account ID from URL params
          const accountId = await getAccountIdFromParams();

          if (!accountId) {
            throw new Error('Account ID not found. Please try again.');
          }

          const requestBody: any = { accountId };

          // For non-Folk platforms, also include userId if available
          if (platform !== 'folk' && userId) {
            requestBody.userId = userId;
          }

          console.log(`📝 Request body for ${platform}:`, requestBody);

          const dataResponse = await fetch(`/api/crm/${platform}/fetch-data`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
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

          if (!apiData.data || apiData.data.length === 0) {
            console.log('📝 No data found');
            setTransformedData({ deals: [], dealContacts: [] });
          } else {
            const createdBy = userId || 'current-user';
            const transformed = transformDeals(
              apiData.data,
              platform,
              apiData.accountId,
              createdBy,
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

        throw new Error('Invalid import state - missing connection data');
      } catch (err) {
        console.error(`💥 ${platform} import error:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    // Helper function to get account ID from URL params
    const getAccountIdFromParams = async (): Promise<string | null> => {
      if (params?.account) {
        // If we have account slug, need to get account ID
        if (supabase) {
          try {
            const { data: account, error } = await supabase
              .from('accounts')
              .select('id')
              .eq('slug', params.account)
              .single();

            if (!error && account) {
              return account.id;
            }
          } catch (err) {
            console.error('Error fetching account ID:', err);
          }
        }
      }
      return null;
    };

    if (searchParams && supabase && platform) {
      handleImport();
    }
  }, [searchParams, supabase, platform, params]);

  const handleImport = async (selectedDeals: any[]) => {
    try {
      setLoading(true);
      console.log(
        `💾 Starting import of ${selectedDeals.length} ${platform} deals...`,
      );

      const selectedDealIds = new Set(selectedDeals.map((deal) => deal.id));

      const filteredContacts = transformedData.dealContacts.filter((contact) =>
        selectedDealIds.has(contact.deal_id),
      );

      await insertTransformedData(
        {
          deals: selectedDeals,
          dealContacts: filteredContacts,
        },
        supabase,
      );

      toast.success(`${config.name} Data Imported Successfully!`, {
        description: `Successfully imported ${selectedDeals.length} deals and ${filteredContacts.length} contacts from ${config.name}.`,
        duration: 5000,
      });

      const accountId = selectedDeals[0]?.account_id;
      if (accountId) {
        console.log(
          `🔗 Marking ${platform} as connected for account ${accountId}`,
        );
        // Update connection here if needed
      }

      localStorage.removeItem('oauth_platform');
      localStorage.removeItem(`${platform}_oauth_state`);

      console.log(`🔄 Redirecting to dealflow for account: ${account}`);
      setTimeout(() => {
        if (account) {
          router.push(
            `/home/${account}/dealflow?import=success&platform=${platform}`,
          );
        } else {
          router.push(
            `/home/${account}/dealflow?import=success&platform=${platform}`,
          );
        }
      }, 1500);
    } catch (err) {
      console.error('💥 Import error:', err);

      toast.error(`${config.name} Import Failed`, {
        description:
          err instanceof Error
            ? `Failed to import ${config.name} data: ${err.message}`
            : `${config.name} import failed due to an unknown error.`,
        duration: 5000,
      });

      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const getAccountIdForRedirect = () => {
    return (
      transformedData.deals[0]?.account_id ||
      params?.account ||
      localStorage.getItem('current_account_id')
    );
  };

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

  if (error) {
    const accountId = getAccountIdForRedirect();

    return (
      <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">
              {config.name} Data Ready for Import
            </h2>
            <p className="mb-4 text-gray-400">
              {transformedData.deals.length === 0
                ? `No ${platform === 'folk' ? 'people' : 'deals'} found in your ${config.name} account, but the connection was successful.`
                : `Found ${transformedData.deals.length} ${platform === 'folk' ? 'people' : 'deals'} from ${config.name} ready for import.`}
            </p>
            {transformedData.deals.length > 0 && (
              <div className="text-sm text-gray-500">
                Review and select the data you want to import into your system.
              </div>
            )}
          </div>
        </div>

        {showImportDialog && transformedData.deals.length > 0 && (
          <DataImportDialog
            deals={transformedData.deals}
            isOpen={showImportDialog}
            onClose={() => {
              setShowImportDialog(false);
              toast.info(`${config.name} Import Cancelled`, {
                description: `You can always import your ${config.name} data later from the integrations page.`,
                duration: 3000,
              });

              // const accountId = getAccountIdForRedirect();
              if (account) {
                router.push(`/home/${account}/integrations`);
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

  // ✅ SUCCESS CASE — return the ImportDialog when not loading or error
  return (
    <>
      {showImportDialog && transformedData.deals.length > 0 && (
        <DataImportDialog
          deals={transformedData.deals}
          isOpen={showImportDialog}
          onClose={() => {
            setShowImportDialog(false);
            toast.info(`${config.name} Import Cancelled`, {
              description: `You can always import your ${config.name} data later from the integrations page.`,
              duration: 3000,
            });

            if (account) {
              router.push(`/home/${account}/integrations`);
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

// ✅ Main page component
async function ImportCRMPage({ params }: ImportPageProps) {
  const { crm: platform } = await params;

  const validPlatforms = ['salesforce', 'hubspot', 'pipedrive', 'zoho', 'folk'];
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
            Supported platforms: Salesforce, HubSpot, Pipedrive, Zoho, Folk
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

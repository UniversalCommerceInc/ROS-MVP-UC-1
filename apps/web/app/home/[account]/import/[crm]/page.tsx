'use client';

import React, { Suspense, use, useEffect, useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

import DataImportDialog from '~/components/data-import-dialog';
import {
  TransformResult,
  checkExistingDeals,
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
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    existingDeals: any[];
    newDeals: any[];
    duplicateInfo: Array<{
      importDeal: any;
      existingDeal: any;
      reason: string;
    }>;
  } | null>(null);
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

        // Check if user just connected (from OAuth callback) or is already connected
        const isFromOAuthCallback = connected === 'true';
        
        if (isFromOAuthCallback) {
          console.log(`✅ User just connected to ${platform} via OAuth, fetching data...`);
        } else {
          console.log(`🔄 User navigated to import page directly, checking existing connection...`);
        }

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
          // Get current user ID from Supabase auth
          const { data: { user } } = await supabase.auth.getUser();
          const createdBy = userId || user?.id || null;
          
          if (!createdBy) {
            throw new Error('Unable to determine current user for import');
          }
          
          console.log(`👤 Import will be created by user: ${createdBy}`);
          
          const transformed = transformDeals(
            apiData.data,
            platform,
            apiData.accountId,
            createdBy,
          );

          // 🔍 CHECK FOR EXISTING DEALS BEFORE SHOWING DIALOG
          console.log('🔍 Checking for existing deals...');
          const duplicateCheck = await checkExistingDeals(
            transformed.deals,
            supabase,
            apiData.accountId,
          );

          setDuplicateCheckResult(duplicateCheck);
          setTransformedData(transformed);

          console.log(`✅ Duplicate check complete:`, {
            total: transformed.deals.length,
            duplicates: duplicateCheck.existingDeals.length,
            new: duplicateCheck.newDeals.length,
          });

          console.log(
            `✅ Transformed: ${transformed.deals.length} deals, ${transformed.dealContacts.length} contacts`,
          );
        }

        setShowImportDialog(true);
        setLoading(false);
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

      let errorMessage = 'Unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;

        // Parse specific error types for better user messaging
        if (
          errorMessage.includes(
            'duplicate key value violates unique constraint "deals_deal_id_key"',
          )
        ) {
          errorMessage = `Some deals already exist in your system. Please refresh the page and try importing only new deals. If the issue persists, contact support.`;
        } else if (errorMessage.includes('Deal insertion partially failed')) {
          errorMessage = `Some deals couldn't be imported due to duplicates or conflicts. ${errorMessage}`;
        }
      }

      toast.error(`${config.name} Import Failed`, {
        description: `Failed to import ${config.name} data: ${errorMessage}`,
        duration: 10000, // Longer duration for error messages
      });

      setError(errorMessage);
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Import Error
            </h2>
            <p className="mb-4 text-gray-400">{error}</p>
            <button
              onClick={() => {
                if (account) {
                  router.push(`/home/${account}/integrations`);
                } else {
                  router.push('/integrations');
                }
              }}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Back to Integrations
            </button>
          </div>
        </div>
      </>
    );
  }

  // ✅ SUCCESS CASE — return the ImportDialog when not loading or error
  return (
    <>
      {showImportDialog && transformedData.deals.length > 0 && (
        <DataImportDialog
          deals={transformedData.deals}
          duplicateCheckResult={duplicateCheckResult}
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

      {/* Show success message if no deals but connection was successful */}
      {showImportDialog && transformedData.deals.length === 0 && (
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="max-w-md text-center">
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
              {config.name} Connected Successfully
            </h2>
            <p className="mb-4 text-gray-400">
              No {platform === 'folk' ? 'people' : 'deals'} found in your{' '}
              {config.name} account, but the connection was successful.
            </p>
            <button
              onClick={() => {
                if (account) {
                  router.push(`/home/${account}/dealflow`);
                } else {
                  router.push('/dealflow');
                }
              }}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Go to Dealflow
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ✅ Main page component
function ImportCRMPage({ params }: ImportPageProps) {
  const { crm: platform } = use(params);

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

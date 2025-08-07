'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Toaster } from '@kit/ui/sonner';

export function RootProviders({ children }: React.PropsWithChildren) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}

function ReactQueryProvider(props: React.PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}

      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

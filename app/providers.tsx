"use client";

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,
  getDefaultWallets,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import {
  arbitrumSepolia, sepolia
} from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
  appName: 'Oracle Market',
  projectId: '6bf0fb8b46e12e88e7664004567b8ab7', // Get one at https://cloud.walletconnect.com
  chains: [arbitrumSepolia, sepolia],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={lightTheme({
            accentColor: 'black',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
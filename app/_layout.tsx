import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { TokenizationProvider } from "@/contexts/TokenizationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="all-assets" options={{ title: "All Assets", presentation: "card" }} />
        <Stack.Screen name="asset-details" options={{ title: "Asset Details", presentation: "card" }} />
        <Stack.Screen name="receive" options={{ title: "Receive Payment", presentation: "card" }} />
        <Stack.Screen name="transactions" options={{ title: "Transactions", presentation: "card" }} />
        <Stack.Screen name="product-details" options={{ title: "Product Details", presentation: "card" }} />
        <Stack.Screen name="scan" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="payment-request" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="change-passcode" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="receipt" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="tokenization-dashboard" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="tokenization-marketplace" options={{ title: "Marketplace", presentation: "card" }} />
        <Stack.Screen name="tokenization-buy" options={{ title: "Buy Tokens", presentation: "card" }} />
        <Stack.Screen name="tokenization-create" options={{ title: "Tokenize Asset", presentation: "card" }} />
        <Stack.Screen name="tokenization-detail" options={{ title: "Asset Details", presentation: "card" }} />
        <Stack.Screen name="tokenization-portfolio" options={{ title: "Portfolio", presentation: "card" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <WalletProvider>
                  <TokenizationProvider>
                    <RootLayoutNav />
                  </TokenizationProvider>
                </WalletProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

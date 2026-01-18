import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.light.background },
        headerTintColor: Colors.light.primary,
        contentStyle: { backgroundColor: Colors.light.background },
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
      <Stack.Screen name="+not-found" />
    </Stack>
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
          <AuthProvider>
            <StatusBar style="dark" />
            <RootLayoutNav />
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

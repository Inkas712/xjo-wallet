import { Tabs } from "expo-router";
import { Home, CreditCard, Send, Package, Coins } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: t('cards'),
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t('payments'),
          tabBarIcon: ({ color, size }) => <Send size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('products'),
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tokenization') || 'Tokenize',
          tabBarIcon: ({ color, size }) => <Coins size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
});

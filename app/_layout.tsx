import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { UserProvider } from '@/context/UserContext';
import { GameProvider } from '@/context/GameContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <GameProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: Colors.background.black,
              },
              headerTintColor: Colors.text.primary,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              contentStyle: {
                backgroundColor: Colors.background.black,
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </GameProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}


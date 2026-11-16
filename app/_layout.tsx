import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { UserProvider } from '@/context/UserContext';
import { GameProvider } from '@/context/GameContext';

export default function RootLayout() {
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setAndroidKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const stackContent = (
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
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <UserProvider>
        <GameProvider>
          <StatusBar style="light" />
          {Platform.OS === 'ios' ? (
            <KeyboardAvoidingView
              style={{ flex: 1, backgroundColor: Colors.background.black }}
              behavior="padding"
            >
              {stackContent}
            </KeyboardAvoidingView>
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: Colors.background.black,
                paddingBottom: androidKeyboardHeight,
              }}
            >
              {stackContent}
            </View>
          )}
        </GameProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}

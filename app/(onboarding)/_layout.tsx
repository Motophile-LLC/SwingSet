import { Stack } from 'expo-router';
import React from 'react';
import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background.black,
        },
        headerTintColor: Colors.accent.copper,
        headerTitleStyle: {
          color: Colors.text.primary,
          fontWeight: '700',
        },
        contentStyle: {
          backgroundColor: Colors.background.black,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="step1-identity"
        options={{
          title: 'Identity & Icebreakers',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="step2-partner"
        options={{
          title: 'Partner Link',
        }}
      />
      <Stack.Screen
        name="step3-preferences"
        options={{
          title: 'Private Boundaries',
        }}
      />
    </Stack>
  );
}

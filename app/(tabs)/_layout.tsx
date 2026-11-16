import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, BookUser, MapPin, Sliders, User } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background.black,
        },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        headerLeft: () => (
          <Image
            source={require('@/assets/SSLogo.png')}
            style={{ width: 28, height: 28, borderRadius: 8, marginLeft: 16 }}
            resizeMode="cover"
          />
        ),
        tabBarStyle: {
          backgroundColor: Colors.background.darkSteel,
          borderTopColor: Colors.border.steelGray,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 8,
          elevation: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarActiveTintColor: Colors.accent.copper,
        tabBarInactiveTintColor: Colors.border.brushedSteel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          headerTitle: 'Mingling Arena',
          tabBarIcon: ({ color, size }) => <Zap color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: 'Venues',
          headerTitle: 'Nashville Excursion Crawl',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Black Book',
          headerTitle: 'Little Black Book',
          tabBarIcon: ({ color, size }) => <BookUser color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="host"
        options={{
          title: 'Host Deck',
          headerTitle: 'Event Host Deck',
          tabBarIcon: ({ color, size }) => <Sliders color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Venue Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}



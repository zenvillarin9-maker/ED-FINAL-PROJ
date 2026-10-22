
import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CAMPUS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  active,
  filled,
  outline,
  color,
  size,
}: {
  active: boolean;
  filled: IconName;
  outline: IconName;
  color: string;
  size: number;
}) {
  return <Ionicons name={active ? filled : outline} size={size} color={color} />;
}

export default function TabLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<Role | null>(null);

  const userId = user?.id;

  useEffect(() => {
    let active = true;

    if (!userId) {
      setRole(null);
      return () => {
        active = false;
      };
    }

    getProfile(userId).then((profile) => {
      if (active) setRole(profile?.role ?? 'student');
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const canManageEvents = role === 'teacher' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: CAMPUS.bg },
        tabBarActiveTintColor: CAMPUS.accent,
        tabBarInactiveTintColor: CAMPUS.textFaint,
        tabBarStyle: {
          backgroundColor: CAMPUS.bgDeep,
          borderTopColor: CAMPUS.border,
          borderTopWidth: 1,
          // Account for the phone's bottom system area.
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1.8,
          fontFamily: 'monospace',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              active={focused}
              filled="home"
              outline="home-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan QR',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              active={focused}
              filled="qr-code"
              outline="qr-code-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              active={focused}
              filled="time"
              outline="time-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              active={focused}
              filled="person"
              outline="person-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          href: canManageEvents ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              active={focused}
              filled="school"
              outline="school-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              active={focused}
              filled="shield-checkmark"
              outline="shield-checkmark-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

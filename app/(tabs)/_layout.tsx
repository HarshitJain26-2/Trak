import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: any;
  navigation: any;
};

const TAB_ITEMS: { name: string; icon: keyof typeof Feather.glyphMap }[] = [
  { name: 'index', icon: 'grid' },
  { name: 'completed', icon: 'check-square' },
  { name: 'new-project', icon: 'plus-circle' },
  { name: 'deleted', icon: 'trash-2' },
  { name: 'profile', icon: 'user' },
];

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <BlurView
      intensity={80}
      tint={colors.isDark ? 'dark' : 'light'}
      style={[
        styles.tabBar,
        {
          paddingBottom: insets.bottom + 4,
          borderTopColor: colors.outlineVariant,
          backgroundColor: Platform.OS === 'android' ? colors.surfaceContainer : colors.glassBg,
        },
      ]}
    >
      {TAB_ITEMS.map((tabItem, index) => {
        const route = state.routes.find(r => r.name === tabItem.name);
        const isActive = route ? state.index === state.routes.indexOf(route) : false;

        return (
          <Pressable
            key={tabItem.name}
            onPress={() => {
              if (tabItem.name === 'new-project') {
                router.push('/new-project');
              } else {
                navigation.navigate(tabItem.name);
              }
            }}
            style={styles.tabItem}
          >
            <View style={styles.tabIconWrapper}>
              <Feather
                name={tabItem.icon}
                size={index === 2 ? 28 : 22}
                color={isActive ? colors.primaryFixed : `${colors.onSurfaceVariant}80`}
              />
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primaryFixed }]} />}
            </View>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

export default function TabsLayout() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Strict authentication verification
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session || !session.user) {
        router.replace('/auth');
      } else {
        setIsCheckingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || !session.user) {
        router.replace('/auth');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isCheckingAuth) {
    return null;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="completed" />
      <Tabs.Screen name="deleted" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIconWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

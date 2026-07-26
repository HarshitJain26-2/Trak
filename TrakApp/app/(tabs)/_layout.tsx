import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: any;
  navigation: any;
};

const TAB_ITEMS: { name: string; icon: keyof typeof Feather.glyphMap }[] = [
  { name: 'index', icon: 'grid' },
  { name: 'deleted', icon: 'trash-2' },
  { name: 'new-project', icon: 'plus-circle' },
  { name: 'completed', icon: 'check-square' },
  { name: 'profile', icon: 'user' },
];

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  const router = useRouter();

  return (
    <BlurView
      intensity={80}
      tint="dark"
      style={[
        styles.tabBar,
        { paddingBottom: insets.bottom + 4 },
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
                color={isActive ? Colors.primaryFixed : `${Colors.onSurfaceVariant}80`}
              />
              {isActive && <View style={styles.activeIndicator} />}
            </View>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="deleted" />
      <Tabs.Screen name="completed" />
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
    borderTopColor: `${Colors.outlineVariant}33`,
    paddingTop: 8,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // Fallback bg for Android (BlurView is iOS-biased)
    backgroundColor: Platform.OS === 'android' ? `${Colors.surfaceContainer}F0` : 'transparent',
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
    backgroundColor: Colors.primaryFixed,
  },
});

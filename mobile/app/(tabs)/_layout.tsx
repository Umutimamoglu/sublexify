import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  
  // Android'de fiziksel nav bar varsa (insets.bottom > 0), sekme çubuğunu nav bar'ın hemen üzerine çıkarıyoruz.
  const bottomOffset = Platform.OS === 'android' ? Math.max(insets.bottom + 12, 24) : 24;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomOffset,
          alignSelf: 'center',
          marginHorizontal: 32,
          height: Platform.OS === 'android' ? 68 : 64,
          paddingBottom: Platform.OS === 'android' ? 6 : 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 28,
          elevation: 0,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          ...Platform.select({
            android: {
              backgroundColor: isDark
                ? 'rgba(17, 17, 27, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              elevation: 16,
            },
          }),
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 10,
          marginTop: Platform.OS === 'android' ? -4 : -2,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: Platform.OS === 'android' ? 8 : 6,
        },
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={80}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: 28, overflow: 'hidden' },
            ]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="film-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: t('tabs.vocabulary'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: t('tabs.lists'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{ href: null }}
      />
    </Tabs>
  );
}

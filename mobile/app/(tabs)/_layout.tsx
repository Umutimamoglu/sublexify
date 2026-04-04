import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const glassAvailable = isGlassEffectAPIAvailable();

function TabIcon({ name, color, size }: { name: IoniconName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useTranslation('common');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: glassAvailable
          ? {
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
            }
          : {
              backgroundColor: theme.colors.tabBackground,
              borderTopColor:  theme.colors.tabBorder,
              borderTopWidth:  1,
            },
        tabBarLabelStyle: {
          fontSize:   theme.fonts.size.xs,
          fontWeight: '500',
        },
        tabBarHideOnKeyboard: true,
        tabBarBackground: glassAvailable
          ? () => (
              <GlassView
                glassEffectStyle="regular"
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
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

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import { Icon, type IconName } from '../components/Icon';
import type { MainTabParamList } from './types';
import HomeStack from './HomeStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, IconName> = {
  HomeTab: 'home',
  CamerasTab: 'videocam',
  PlaybackTab: 'history',
  AlertsTab: 'notifications',
  ProfileTab: 'person',
};

const HomeStackCameras = () => <HomeStack initial="Cameras" />;
const HomeStackPlayback = () => <HomeStack initial="Playback" />;
const HomeStackAlerts = () => <HomeStack initial="Alerts" />;
const HomeStackProfile = () => <HomeStack initial="Settings" />;

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabHeight = 56 + insets.bottom;
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: tabHeight,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => (
          <Icon name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" options={{ title: 'Home' }} component={HomeStack} />
      <Tab.Screen name="CamerasTab" options={{ title: 'Kamera' }} component={HomeStackCameras} />
      <Tab.Screen name="PlaybackTab" options={{ title: 'Rekaman' }} component={HomeStackPlayback} />
      <Tab.Screen name="AlertsTab" options={{ title: 'Alert' }} component={HomeStackAlerts} />
      <Tab.Screen name="ProfileTab" options={{ title: 'Profil' }} component={HomeStackProfile} />
    </Tab.Navigator>
  );
}

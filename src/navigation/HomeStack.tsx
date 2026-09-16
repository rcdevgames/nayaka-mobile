import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import type { HomeStackParamList } from './types';

import DashboardScreen from '../screens/home/DashboardScreen';
import CamerasScreen from '../screens/home/CamerasScreen';
import CameraDetailScreen from '../screens/home/CameraDetailScreen';
import LiveViewScreen from '../screens/home/LiveViewScreen';
import PlaybackScreen from '../screens/home/PlaybackScreen';
import PlaybackDetailScreen from '../screens/home/PlaybackDetailScreen';
import AlertsScreen from '../screens/home/AlertsScreen';
import EmergencyScreen from '../screens/home/EmergencyScreen';
import ProfileScreen from '../screens/home/ProfileScreen';
import SubscriptionScreen from '../screens/home/SubscriptionScreen';
import HelpScreen from '../screens/home/HelpScreen';
import TermsScreen from '../screens/home/TermsScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

type Initial = keyof HomeStackParamList;

/**
 * Stack navigator for main-feature screens. Every screen draws its own
 * header + safe area, so native header stays hidden.
 * Reused per bottom tab (one navigator instance per tab).
 */
export default function HomeStack({ initial = 'Dashboard' }: { initial?: Initial }) {
  return (
    <Stack.Navigator
      initialRouteName={initial}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Cameras" component={CamerasScreen} />
      <Stack.Screen name="CameraDetail" component={CameraDetailScreen} />
      <Stack.Screen name="LiveView" component={LiveViewScreen} />
      <Stack.Screen name="Playback" component={PlaybackScreen} />
      <Stack.Screen name="PlaybackDetail" component={PlaybackDetailScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="Settings" component={ProfileScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen // @ts-ignore
 name="Terms" component={TermsScreen} />
    </Stack.Navigator>
  );
}

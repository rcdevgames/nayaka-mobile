import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import { rootNavigatorStyles as styles } from '../theme/styles';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList, AuthStackParamList } from './types';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import MainTabs from './MainTabs';

const Root = createNativeStackNavigator<RootStackParamList>();
const Auth = createNativeStackNavigator<AuthStackParamList>();

function AuthFlow() {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false }}>
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="Register" component={RegisterScreen} />
      <Auth.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Auth.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Auth.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashText}>N</Text>
        </View>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Root.Screen name="Main" component={MainTabs} />
      ) : (
        <Root.Screen name="Auth" component={AuthFlow} />
      )}
    </Root.Navigator>
  );
}



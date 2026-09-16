/**
 * NayakaCCTV — mobile app entry.
 * CCTV monitoring app for end users (Bahasa Indonesia).
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { getTheme } from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';

function App() {
  // Screens currently use light theme constants; force light palette.
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <DataProvider>
          <NavigationContainer theme={getTheme(false)}>
            <RootNavigator />
          </NavigationContainer>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

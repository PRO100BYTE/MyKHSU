import React, { useState, useEffect } from 'react';
import { View, Text, Platform, Appearance, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

// Импорт компонентов
import SplashScreen from './components/SplashScreen';
import TabButton from './components/TabButton';
import PlaceholderScreen from './components/PlaceholderScreen';
import NewsScreen from './components/NewsScreen';
import ScheduleScreen from './components/ScheduleScreen';
import SettingsScreen from './components/SettingsScreen';
import MapScreen from './components/MapScreen';
import NotificationsSettingsModal from './components/NotificationsSettingsModal';

// Импорт утилит
import { ACCENT_COLORS, SCREENS } from './utils/constants';
import * as Sentry from '@sentry/react-native';
import { registerForPushNotificationsAsync } from './utils/notifications';

Sentry.init({
  dsn: 'https://9954c52fe80999a51a6905e3ee180d11@sentry.sculkmetrics.com/5',
  sendDefaultPii: true,
});

const App = () => {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold
  });
  
  const systemColorScheme = Appearance.getColorScheme();
  const [activeScreen, setActiveScreen] = useState(SCREENS.SCHEDULE);
  const [accentColor, setAccentColor] = useState('blue');
  const [theme, setTheme] = useState('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const storedTheme = await SecureStore.getItemAsync('theme');
        if (storedTheme) {
          setTheme(storedTheme);
        }
        const storedAccentColor = await SecureStore.getItemAsync('accentColor');
        if (storedAccentColor) {
          setAccentColor(storedAccentColor);
        }
        await registerForPushNotificationsAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsLoading(false);
      }
    }
    prepare();
  }, []);

  if (!fontsLoaded || isLoading) {
    return <SplashScreen accentColor={accentColor} theme={theme} />;
  }

  const effectiveTheme = theme === 'auto' ? systemColorScheme || 'light' : theme;
  const colors = ACCENT_COLORS[accentColor];
  const tabBgColor = effectiveTheme === 'light' ? '#f3f4f6' : '#111827';
  const containerBgColor = effectiveTheme === 'light' ? '#ffffff' : '#1f2937';

  const renderScreen = () => {
    switch (activeScreen) {
      case SCREENS.SCHEDULE:
        return <ScheduleScreen theme={effectiveTheme} accentColor={accentColor} />;
      case SCREENS.MAP:
        return <MapScreen theme={effectiveTheme} accentColor={accentColor} />;
      case SCREENS.FRESHMAN:
        return <PlaceholderScreen title={SCREENS.FRESHMAN} theme={effectiveTheme} />;
      case SCREENS.NEWS:
        return <NewsScreen theme={effectiveTheme} accentColor={accentColor} />;
      case SCREENS.SETTINGS:
        return <SettingsScreen
          theme={effectiveTheme}
          accentColor={accentColor}
          setTheme={setTheme}
          setAccentColor={setAccentColor}
          openNotificationsModal={() => setNotificationsModalVisible(true)}
        />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: containerBgColor }]}>
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      <View style={[styles.tabBar, { backgroundColor: tabBgColor, borderColor: effectiveTheme === 'light' ? '#e5e7eb' : '#374151' }]}>
        <TabButton 
          icon="calendar-outline" 
          label={SCREENS.SCHEDULE} 
          isActive={activeScreen === SCREENS.SCHEDULE} 
          onPress={() => setActiveScreen(SCREENS.SCHEDULE)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="map-outline" 
          label={SCREENS.MAP} 
          isActive={activeScreen === SCREENS.MAP} 
          onPress={() => setActiveScreen(SCREENS.MAP)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="book-outline" 
          label={SCREENS.FRESHMAN} 
          isActive={activeScreen === SCREENS.FRESHMAN} 
          onPress={() => setActiveScreen(SCREENS.FRESHMAN)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="newspaper-outline" 
          label={SCREENS.NEWS} 
          isActive={activeScreen === SCREENS.NEWS} 
          onPress={() => setActiveScreen(SCREENS.NEWS)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="settings-outline" 
          label={SCREENS.SETTINGS} 
          isActive={activeScreen === SCREENS.SETTINGS} 
          onPress={() => setActiveScreen(SCREENS.SETTINGS)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
      </View>

      <NotificationsSettingsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        theme={effectiveTheme}
        accentColor={accentColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 0, // Добавляем отступ для Android, если необходимо
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});

export default App;
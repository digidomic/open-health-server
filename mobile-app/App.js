import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HealthKitService from './services/HealthKitService';
import ApiService from './services/ApiService';
import DashboardWebView from './components/DashboardWebView';

const App = () => {
  const [settings, setSettings] = useState({
    serverIp: '192.168.9.20',
    frontendPort: '8080',
    backendPort: '8000',
    token: '',
    autoSync: false,
    lastSync: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on startup
  useEffect(() => {
    loadSettings();
  }, []);

  // Setup HealthKit and background sync
  useEffect(() => {
    if (settings.token) {
      initializeHealthKit();
    }
  }, [settings.token]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('healthTrackerSettings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('healthTrackerSettings', JSON.stringify(settings));
      Alert.alert('Erfolg', 'Einstellungen gespeichert!');
      setShowSettings(false);
      initializeHealthKit();
    } catch (error) {
      Alert.alert('Fehler', 'Einstellungen konnten nicht gespeichert werden.');
    }
  };

  const initializeHealthKit = async () => {
    const initialized = await HealthKitService.initialize();
    if (initialized) {
      console.log('HealthKit initialized');
      if (settings.autoSync) {
        setupBackgroundSync();
      }
    }
  };

  const setupBackgroundSync = async () => {
    // Background fetch configuration
    // This runs every ~15 minutes when iOS decides it's a good time
    const status = await HealthKitService.configureBackgroundFetch(syncHealthData);
    console.log('Background fetch status:', status);
  };

  const syncHealthData = async () => {
    try {
      console.log('Syncing health data...');
      
      // Get yesterday's data (today might be incomplete)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];

      // Fetch health data
      const healthData = await HealthKitService.getHealthDataForDate(yesterday);
      
      if (healthData) {
        // Send to backend
        const success = await ApiService.sendHealthData(
          settings.serverIp,
          settings.backendPort,
          settings.token,
          {
            datum: dateString,
            ...healthData,
            notizen: 'Automatisch von iOS App',
          }
        );

        if (success) {
          const newSettings = { ...settings, lastSync: new Date().toISOString() };
          setSettings(newSettings);
          await AsyncStorage.setItem('healthTrackerSettings', JSON.stringify(newSettings));
          console.log('Sync successful');
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const manualSync = async () => {
    if (!settings.token) {
      Alert.alert('Fehler', 'Bitte zuerst Token in Einstellungen eingeben.');
      return;
    }
    
    Alert.alert(
      'Sync starten',
      'Welches Datum synchronisieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Gestern', 
          onPress: () => syncHealthData() 
        },
        { 
          text: 'Heute', 
          onPress: async () => {
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            const healthData = await HealthKitService.getHealthDataForDate(today);
            if (healthData) {
              await ApiService.sendHealthData(
                settings.serverIp,
                settings.backendPort,
                settings.token,
                { datum: dateString, ...healthData, notizen: 'Manuell von iOS App' }
              );
              Alert.alert('Erfolg', 'Daten synchronisiert!');
            }
          }
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Lade...</Text>
      </SafeAreaView>
    );
  }

  if (showSettings || !settings.token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Health Tracker</Text>
          <Text style={styles.subtitle}>Einstellungen</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server IP</Text>
            <TextInput
              style={styles.input}
              value={settings.serverIp}
              onChangeText={(text) => setSettings({ ...settings, serverIp: text })}
              placeholder="192.168.1.100"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frontend Port</Text>
            <TextInput
              style={styles.input}
              value={settings.frontendPort}
              onChangeText={(text) => setSettings({ ...settings, frontendPort: text })}
              placeholder="8080"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Backend Port</Text>
            <TextInput
              style={styles.input}
              value={settings.backendPort}
              onChangeText={(text) => setSettings({ ...settings, backendPort: text })}
              placeholder="8000"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Auth Token</Text>
            <TextInput
              style={styles.input}
              value={settings.token}
              onChangeText={(text) => setSettings({ ...settings, token: text })}
              placeholder="dein_token_hier"
              secureTextEntry
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Automatischer Sync</Text>
            <Switch
              value={settings.autoSync}
              onValueChange={(value) => setSettings({ ...settings, autoSync: value })}
            />
          </View>

          {settings.lastSync && (
            <Text style={styles.lastSync}>
              Letzter Sync: {new Date(settings.lastSync).toLocaleString('de-DE')}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <Button title="Speichern" onPress={saveSettings} />
          </View>

          {settings.token && (
            <View style={styles.buttonContainer}>
              <Button title="Zurück zum Dashboard" onPress={() => setShowSettings(false)} color="#6b7280" />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <Button title="⚙️ Einstellungen" onPress={() => setShowSettings(true)} />
        <Button title="🔄 Sync" onPress={manualSync} />
      </View>
      
      <DashboardWebView 
        serverIp={settings.serverIp}
        frontendPort={settings.frontendPort}
        token={settings.token}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
  },
  buttonContainer: {
    marginTop: 10,
  },
  lastSync: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 10,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
});

export default App;
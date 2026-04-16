import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { initDatabase } from './src/database/database';
import { startAutoSync } from './src/services/syncService';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        // 1. Initialize SQLite database and create tables
        await initDatabase();

        // 2. Start listening for connectivity changes
        //    Syncs unsynced data whenever phone goes online
        const unsubscribe = startAutoSync();

        setIsReady(true);

        // Cleanup: stop listening when app unmounts
        return () => unsubscribe();
      } catch (error) {
        console.error("❌ App setup failed:", error);
      }
    }

    setup();
  }, []);

  // Show loading screen while database initializes
  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading Simpchik...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>✅ Simpchik is ready!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

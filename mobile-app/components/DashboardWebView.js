import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const DashboardWebView = ({ serverIp, frontendPort, token }) => {
  const dashboardUrl = `http://${serverIp}:${frontendPort}/?token=${token}`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: dashboardUrl }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        )}
        // Allow HTTP (not just HTTPS) for local network
        mixedContentMode="always"
        // Handle errors gracefully
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DashboardWebView;
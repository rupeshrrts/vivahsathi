import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, BackHandler, Linking, Modal, Platform,
  Pressable, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { defaultStore, isStorePage, storeOrigin } from './store-url';

const configuredStore = storeOrigin(process.env.EXPO_PUBLIC_STORE_URL);
const initialStore = configuredStore || defaultStore(Constants.expoConfig?.hostUri, Platform.OS);
const externalSchemes = /^(https?:\/\/|tel:|mailto:|sms:|whatsapp:|upi:)/i;

function StoreApp() {
  const web = useRef(null);
  const [origin, setOrigin] = useState(initialStore);
  const [address, setAddress] = useState(initialStore);
  const [editing, setEditing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const source = useMemo(() => ({ uri: origin + '/' }), [origin]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || failed) return false;
      web.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, failed]);

  const reload = () => {
    setFailed(false);
    setCanGoBack(false);
    setAttempt(value => value + 1);
  };

  const editServer = () => {
    setAddress(origin);
    setInvalid(false);
    setEditing(true);
  };

  const connect = () => {
    const next = storeOrigin(address);
    if (!next) {
      setInvalid(true);
      return;
    }
    setOrigin(next);
    setEditing(false);
    reload();
  };

  const openExternal = url => {
    if (externalSchemes.test(url)) {
      Linking.openURL(url).catch(() => Alert.alert('Can’t open this link', 'Check that a compatible app is installed.'));
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#26172f" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => web.current?.goBack()} disabled={!canGoBack || failed} style={styles.headerAction}>
          <Text style={[styles.headerLink, (!canGoBack || failed) && styles.inactive]}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.brand}>Vivah Saathi</Text>
        <Pressable accessibilityRole="button" onPress={editServer} style={styles.headerAction}>
          <Text style={styles.headerLink}>Server</Text>
        </Pressable>
      </View>
      {failed ? (
        <View style={styles.center}>
          <Text style={styles.title}>Store unavailable</Text>
          <Text style={styles.body}>Start Vivah Saathi on your laptop and connect your phone to the same Wi-Fi.</Text>
          <Text selectable style={styles.address}>{origin}</Text>
          <Pressable accessibilityRole="button" style={styles.primary} onPress={reload}>
            <Text style={styles.primaryLabel}>Try again</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={editServer} style={styles.secondary}>
            <Text style={styles.secondaryLabel}>Change server</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={attempt}
          ref={web}
          source={source}
          style={styles.web}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={request => {
            if (request.url === 'about:blank' || isStorePage(request.url, origin)) return true;
            if (request.isTopFrame === false) return /^https?:\/\//i.test(request.url);
            // Allow payment forms to stay in their existing WebView session.
            if (/^https:\/\/(?:[a-z0-9-]+\.)*razorpay\.com(?=[/:?#]|$)/i.test(request.url)) return true;
            openExternal(request.url);
            return false;
          }}
          onOpenWindow={({ nativeEvent: { targetUrl } }) => openExternal(targetUrl)}
          onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
          onError={() => setFailed(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.url === origin + '/' || nativeEvent.url.startsWith(origin + '/#')) setFailed(true);
          }}
          onContentProcessDidTerminate={reload}
          onRenderProcessGone={reload}
          domStorageEnabled
          geolocationEnabled
          allowsBackForwardNavigationGestures
          startInLoadingState
          renderLoading={() => <View style={[styles.center, StyleSheet.absoluteFill]}><ActivityIndicator size="large" color="#623376" /></View>}
        />
      )}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.title}>Store server</Text>
            <Text style={styles.body}>Enter your laptop’s Wi-Fi address and port, or the hosted store URL.</Text>
            <TextInput
              accessibilityLabel="Store server address"
              style={styles.input}
              value={address}
              onChangeText={value => { setAddress(value); setInvalid(false); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={connect}
            />
            {invalid && <Text accessibilityLiveRegion="polite" style={styles.error}>Enter a server address such as http://192.168.1.20:3000.</Text>}
            <Pressable accessibilityRole="button" style={styles.primary} onPress={connect}><Text style={styles.primaryLabel}>Connect</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.secondary}><Text style={styles.secondaryLabel}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><StoreApp /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#26172f' },
  header: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  headerAction: { minWidth: 62, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerLink: { color: '#ffe0bd', fontWeight: '600' },
  inactive: { color: '#aa9ab4' },
  brand: { color: '#fff4f9', fontSize: 17, fontWeight: '700' },
  web: { flex: 1, backgroundColor: '#f6f1f8' },
  center: { flex: 1, justifyContent: 'center', padding: 26, backgroundColor: '#f6f1f8' },
  title: { color: '#2b1934', fontSize: 24, fontWeight: '700' },
  body: { color: '#605568', marginVertical: 12, fontSize: 15, lineHeight: 22 },
  address: { color: '#623376', marginBottom: 12 },
  primary: { backgroundColor: '#623376', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryLabel: { color: '#fff', fontWeight: '700' },
  secondary: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  secondaryLabel: { color: '#623376', fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#26172fb3' },
  dialog: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#bfa3ca', borderRadius: 8, paddingHorizontal: 10, color: '#2b1934' },
  error: { color: '#9b1b42', marginTop: 8 },
});

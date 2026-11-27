# Vivah Saathi mobile app

The Expo React Native app loads the existing mobile storefront in a WebView. The shop, service and vendor bookings, packages, cart, checkout and order tracking use the same Node server and data as the website. Storefront updates show up in the app after it reloads. The device keeps its own cart and login session.

## Build for Google Play

The Android release build is an Android App Bundle (`.aab`) created with EAS Build. The app must connect to a live, public HTTPS storefront; a local laptop address is not suitable for a Play Store release.

1. Deploy the store server with HTTPS and persistent storage.
2. Create or sign in to an Expo account, then link this app to an EAS project:

   ```powershell
   npx.cmd eas-cli login
   npx.cmd eas-cli init
   ```

3. In the EAS project, add `EXPO_PUBLIC_STORE_URL` to the **production** environment. Set it to the store's HTTPS origin, for example `https://shop.example.com` (no path or trailing route). Production builds stop with an error if this setting is missing or not HTTPS.
4. Build a test APK first:

   ```powershell
   npx.cmd eas-cli build --platform android --profile preview
   ```

5. Install the APK on real Android devices and test sign-in, cart, checkout, payments, location, external links, and order tracking against the live server.
6. Build the Play Store bundle:

   ```powershell
   npx.cmd eas-cli build --platform android --profile production
   ```

   EAS can create and manage the Android signing key. Keep the key and recovery information safe; future releases must use the same signing identity.
7. Download the `.aab` from EAS and upload it to a Google Play Console internal testing track before requesting production access.

The project has an app icon and adaptive icon configured. Before submitting, complete the Play Console listing (screenshots, descriptions, contact details, privacy policy URL, content rating, and Data safety form) and test the app against Play policies. This app primarily displays the existing storefront in a WebView, so Play approval is not guaranteed; the app must meet current functionality and WebView-content policies.

The app's Android package name is `in.vivahsaathi.mobile`. Once an app is published, changing this identifier requires publishing a separate app. The production profile increments Android's version code for each EAS build.

## Run on a Windows laptop and an Android phone

Use Node.js 20.19.4 or later. Open two terminals in the project root.

**Terminal 1 — store server**

```powershell
npm.cmd start
```

If the storefront is already running on port 3000, keep using that server.

**Terminal 2 — mobile app**

```powershell
cd mobile-app
npm.cmd install
npm.cmd start
```

1. Connect the laptop and phone to the same Wi-Fi.
2. Install the Expo Go version for **SDK 54** and scan the QR code from the second terminal. The compatible Android build is available from [Expo Go downloads](https://expo.dev/go).
3. The app tries the Expo server's local address on port 3000. If the store is unavailable, run `ipconfig` on the laptop and enter its Wi-Fi IPv4 address in **Server**, for example `http://192.168.1.20:3000`. That URL should also open in the phone's browser. Windows Firewall may need to allow Node.js on the private network.

For an Android Studio emulator, use `npm.cmd run android`. If needed, set the store server to `http://10.0.2.2:3000`. On macOS with an iOS simulator, `npm run ios` launches the app using the local backend.

## Configure a fixed store URL

Copy `.env.example` to `.env` in this folder, set `EXPO_PUBLIC_STORE_URL`, and restart Expo. Use a hosted HTTPS URL for testing real sessions, payments and browser location features. The in-app **Server** setting lets you switch addresses for the current session.

WhatsApp, maps and phone links can open their corresponding apps. Printing receipts can be done from the storefront in a browser. Payment and device integrations depend on the store and phone configuration.

## Verify the Android bundle

```powershell
npx.cmd expo export --platform android
```

The export checks that Expo can bundle the source. To try the app itself, open it in Expo Go or an emulator.

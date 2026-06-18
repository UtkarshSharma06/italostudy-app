import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.italostudy.app',
  appName: 'ItaloStudy',
  webDir: 'dist',

  // On native, load the bundled web assets from the dist folder.
  // Set server.url during local dev testing over USB (npx cap run android).
  // Comment out the server block before building for release.
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:8080',
  //   cleartext: true,
  // },

  plugins: {
    // ── Google Auth ──────────────────────────────────────────────────────────
    // Get your client IDs from Google Cloud Console:
    //   Android: OAuth 2.0 > Android client
    //   iOS: OAuth 2.0 > iOS client (Bundle ID: com.italostudy.app)
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_WEB_OAUTH_CLIENT_ID_FROM_GOOGLE_CLOUD.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },

    // ── Push Notifications ───────────────────────────────────────────────────
    // FCM — add google-services.json to android/app/ after `npx cap add android`
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // ── Status Bar ───────────────────────────────────────────────────────────
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#000000',
      overlaysWebView: true,
    },

    // ── Keyboard ─────────────────────────────────────────────────────────────
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // ── Splash Screen ────────────────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },

    // ── Local Notifications ───────────────────────────────────────────────────
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6366f1',
    },
  },

  // Android-specific overrides
  android: {
    // Registers com.italostudy.app:// as a deep link scheme for OAuth callbacks.
    // This is what makes `supabase.auth.signInWithOAuth({ redirectTo: 'com.italostudy.app://google-auth' })`
    // route back into the app after the browser login is complete.
    appendUserAgent: 'ItaloStudy-Android',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false, // set to true during debug builds
  },

  // iOS-specific overrides
  ios: {
    appendUserAgent: 'ItaloStudy-iOS',
    contentInset: 'always',
    scrollEnabled: true,
  },
};

export default config;

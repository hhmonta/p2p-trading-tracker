import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.p2ptracker.app',
  appName: 'P2P Tracker',
  webDir: 'out',
  server: {
    // When running in development, use the dev server URL
    url: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined,
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0a',
  },
};

export default config;

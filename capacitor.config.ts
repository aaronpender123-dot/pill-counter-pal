import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d121648cb8ea4eb0b5b42c184b1e6ba8',
  appName: 'PillCount',
  webDir: 'dist',
  server: {
    url: 'https://d121648c-b8ea-4eb0-b5b4-2c184b1e6ba8.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      // iOS camera permissions are configured in Info.plist
      // Android camera permissions are configured in AndroidManifest.xml
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

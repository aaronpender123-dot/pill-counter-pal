import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aaronpender.pillcount',
  appName: 'PillCount',
  webDir: 'dist',
  // server block removed for production build
  plugins: {
    Camera: {
      // iOS camera permissions are configured in Info.plist
      // Android camera permissions are configured in AndroidManifest.xml
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#2BBCBE',
      splashFullScreen: true,
      splashImmersive: true,
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

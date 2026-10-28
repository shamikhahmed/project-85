import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capricorn.project85',
  appName: 'PROJECT 85',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    // CSS owns safe-area insets — automatic inset + our padding double-shrinks / skews width
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Project 85',
  },
  plugins: {},
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tictactoe.online',
  appName: 'TicTacToe Online',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    cleartext: true // Allow HTTP connections for development
  },
  android: {
    allowMixedContent: true // Allow mixed HTTP/HTTPS content
  }
};

export default config;

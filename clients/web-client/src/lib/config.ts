// Environment configuration for service URLs
// For mobile: Use your computer's local IP address
// For web: Use localhost

export const ENV = {
  // Change this to your computer's local IP when building for mobile
  // Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
  HOST: import.meta.env.VITE_HOST || 'localhost',
  
  USER_SERVICE: `http://${import.meta.env.VITE_HOST || 'localhost'}:3001`,
  ROOM_SERVICE: `http://${import.meta.env.VITE_HOST || 'localhost'}:3002`,
  ROOM_SERVICE_WS: `ws://${import.meta.env.VITE_HOST || 'localhost'}:3002`,
  GAME_SERVICE: `http://${import.meta.env.VITE_HOST || 'localhost'}:3003`
};

/**
 * Expo app config with runtime env injection for EAS builds.
 * Ensures EXPO_PUBLIC_* are available at build time and injected into extra.
 */
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      // Resolve at build time (EAS injects EXPO_PUBLIC_* from secrets)
      supabaseRedirectTo:
        process.env.EXPO_PUBLIC_SUPABASE_URL != null
          ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback`
          : appJson.expo.extra?.supabaseRedirectTo ?? '',
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? appJson.expo.extra?.googleClientId ?? '',
    },
  },
};

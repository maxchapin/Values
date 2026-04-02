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
      policyVersion: process.env.EXPO_PUBLIC_POLICY_VERSION ?? appJson.expo.extra?.policyVersion ?? '1',
      privacyPolicyUrl:
        process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? appJson.expo.extra?.privacyPolicyUrl ?? '',
      termsOfServiceUrl:
        process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL ?? appJson.expo.extra?.termsOfServiceUrl ?? '',
      deleteAccountEdgeUrl: process.env.EXPO_PUBLIC_DELETE_ACCOUNT_EDGE_URL ?? '',
      supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@example.com',
      // Resolve at build time (EAS injects EXPO_PUBLIC_* from secrets)
      supabaseRedirectTo:
        process.env.EXPO_PUBLIC_SUPABASE_URL != null
          ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback`
          : appJson.expo.extra?.supabaseRedirectTo ?? '',
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? appJson.expo.extra?.googleClientId ?? '',
    },
    // ADD THIS PLUGINS ARRAY
    plugins: [
      "@react-native-community/datetimepicker"
    ],
    // ADD THESE TWO BLOCKS FOR EAS UPDATE
    updates: {
      url: "https://u.expo.dev/5ba96ab4-b67a-4a67-be1c-547129534a1d",
    },
    runtimeVersion: {
      policy: "appVersion"
    },
  },
};


# CLI commands cheat sheet

A quick reference for common Expo and EAS commands used in this app. Use it while coding or when you forget the exact flags.

---

## Most used (Expo + Apple)

| Command | What it does |
|--------|----------------|
| `npx expo start` | Start dev server; open in Expo Go or simulator. **Daily development.** |
| `npx expo start --ios` | Start and open iOS Simulator with Expo Go. |
| `npx expo run:ios` | Build and run a **development** iOS app (no Expo Go). |
| `eas build --platform ios --profile development` | Build an iOS dev binary (e.g. for device/simulator). |
| `eas build --platform ios --profile preview` | Build an iOS **preview** (TestFlight/internal). |
| `eas submit --platform ios --latest` | Submit the latest iOS build to App Store Connect. |

---

## General project commands

| Command | Description | When to use |
|--------|-------------|-------------|
| `npm install` | Install dependencies. | After clone, or when `package.json` changes. |
| `npm test` | Run Jest tests. | Before commit; CI. |
| `npm run lint` | Run ESLint (if configured). | Before commit. |
| `npx expo install` | Add a package compatible with your Expo SDK. | When adding native or Expo-related deps. |
| `npx expo doctor` | Check for config/dependency issues. | When something feels broken or after upgrading. |

---

## Local Expo dev (Expo Go)

| Command | Description | When to use |
|--------|-------------|-------------|
| `npx expo start` | Start Metro and show QR code / options. | Daily dev; open in Expo Go on device or simulator. |
| `npx expo start --ios` | Start and open the app in **iOS Simulator** (Expo Go). | When you want iOS simulator without picking it. |
| `npx expo start --android` | Start and open in **Android emulator** (Expo Go). | When you want Android emulator. |
| `npx expo start --tunnel` | Start with tunnel URL (e.g. for physical device on another network). | When phone and computer aren’t on same Wi‑Fi. |
| `npx expo start --clear` | Start with cleared Metro cache. | After weird cache bugs or dependency changes. |

---

## Native run / local debug builds

| Command | Description | When to use |
|--------|-------------|-------------|
| `npx expo run:ios` | Build and run the iOS app locally (dev client / dev build). | When you need native code or modules that don’t work in Expo Go. |
| `npx expo run:ios --device` | Run on a connected **physical** iOS device. | Testing on real device without EAS. |
| `npx expo run:android` | Build and run the Android app locally. | Same as above, for Android. |
| `npx expo prebuild` | Generate `ios/` and `android/` from app config. | When you need to tweak native projects or before `run:ios` / `run:android`. |

---

## EAS Build (cloud builds)

| Command | Description | When to use |
|--------|-------------|-------------|
| `eas build --platform ios` | Build iOS app in the cloud (interactive profile choice). | When you want a shareable or store-ready iOS build. |
| `eas build --platform android` | Build Android app in the cloud. | Same for Android. |
| `eas build --platform all` | Build both iOS and Android. | When you want both in one go. |
| `eas build --platform ios --profile development` | iOS **development** build (Expo dev client). | Dev/testing on device or simulator. |
| `eas build --platform ios --profile preview` | iOS **preview** build (ad hoc / internal). | TestFlight or internal testers. |
| `eas build --platform ios --profile production` | iOS **production** build. | Release to App Store. |
| `eas build:list` | List recent builds. | Check status or get build IDs. |
| `eas build:view` | Open latest build in browser (or specify build ID). | Inspect logs or download build. |

---

## EAS Submit (App Store & Play Store)

| Command | Description | When to use |
|--------|-------------|-------------|
| `eas submit --platform ios --latest` | Submit the **latest** iOS build to App Store Connect. | After a successful production/preview build. |
| `eas submit --platform ios --id <BUILD_ID>` | Submit a specific iOS build by ID. | When you don’t want “latest”. |
| `eas submit --platform android --latest` | Submit the latest Android build to Play Console. | After a successful Android build. |
| `eas submit --platform ios --latest --non-interactive` | Submit without prompts (e.g. CI). | Automation / CI pipelines. |
| `eas submit:list` | List recent submissions. | Check submit status. |

---

## Misc & diagnostics

| Command | Description | When to use |
|--------|-------------|-------------|
| `npx expo doctor` | Check Expo config, SDK, and dependencies. | After upgrading or when something feels off. |
| `npx expo config` | Print resolved app config (app.json + overrides). | Debug config or env. |
| `eas whoami` | Show logged-in EAS account. | Confirm you’re on the right account. |
| `eas credentials` | Manage iOS/Android credentials (certificates, keys). | When credentials are missing or expired. |
| `npx expo-updates` | (If using Expo Updates) Check update config. | When debugging OTA updates. |

---

## Tips

- Prefer **`npx expo …`** and **`eas …`** (not legacy `expo-cli`).
- For **Apple**: dev flow is often `npx expo start --ios` or `npx expo run:ios`; for store, `eas build --platform ios --profile production` then `eas submit --platform ios --latest`.
- Set **profiles** in `eas.json` (e.g. `development`, `preview`, `production`) and pass them with `--profile` so builds match what you want (dev vs TestFlight vs store).

import type { ExpoConfig } from "@expo/config";
import dotenv from "dotenv";

dotenv.config({
  path: "../../.env",
});

// todo: https://docs.expo.dev/build-reference/variables/#how-to-upload-a-secret-file-and-use-it-in-my-app-config

const defineConfig = (): ExpoConfig => ({
  name: "Graysky",
  slug: "graysky",
  scheme: "graysky",
  version: "0.1.1",
  owner: "mozzius",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/graysky.png",
    resizeMode: "cover",
    backgroundColor: "#888888",
  },
  updates: {
    fallbackToCacheTimeout: 0,
    url: "https://u.expo.dev/7e8ff69c-ba23-4bd8-98ce-7b61b05766c4",
  },
  runtimeVersion: {
    policy: "sdkVersion",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "dev.mozzius.graysky",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      UIViewControllerBasedStatusBarAppearance: false,
      CADisableMinimumFrameDurationOnPhone: true,
    },
  },
  android: {
    package: "dev.mozzius.graysky",
    softwareKeyboardLayoutMode: "pan",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#888888",
    },
  },
  extra: {
    eas: {
      projectId: "7e8ff69c-ba23-4bd8-98ce-7b61b05766c4",
    },
    revenueCat: {
      ios: process.env.REVENUECAT_API_KEY_IOS,
    },
    sentry: process.env.SENTRY_DSN,
  },
  hooks: {
    postPublish: [
      {
        file: "sentry-expo/upload-sourcemaps",
        config: {
          organization: "graysky",
          project: "graysky",
        },
      },
    ],
  },
  plugins: [
    "./expo-plugins/with-modify-gradle.js",
    "expo-build-properties",
    "expo-localization",
    "sentry-expo",
    "expo-router",
    [
      "expo-media-library",
      {
        savePhotosPermission:
          "This app accesses your photos to let you save images to your device.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "This app accesses your photos to let you add images to your posts.",
        cameraPermission:
          "This app accesses your camera to let you add photos from your camera to your posts.",
      },
    ],
  ],
});

export default defineConfig;

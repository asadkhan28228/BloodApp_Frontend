import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Registers this device with Expo and returns its Expo push token.
 * Sending notifications is intentionally done by the ASP.NET backend,
 * so notifications can arrive while the app is backgrounded or killed.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Blood Care Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#DC2626",
        sound: "default",
      });
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notification permission was not granted.");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error("Expo EAS projectId is missing from app configuration.");
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("Expo push token:", token.data);
    return token.data;
  } catch (error) {
    console.error("Push notification registration failed:", error);
    return null;
  }
}

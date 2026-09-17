import * as Location from "expo-location";
import { doc, updateDoc } from "@/src/lib/backendCompat";
import { auth, db } from "../config/backendConfig";

// ======================================================
// GET FRESH GPS COORDINATES
//
// Used by the emergency report flow so every emergency is
// tagged with the reporter's live GPS location at the exact
// moment it is reported (not just their last saved location).
// ======================================================

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export const getFreshGpsLocation =
  async (): Promise<GpsCoordinates | null> => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Location permission denied");
        return null;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
    } catch (error) {
      console.error(
        "Error getting fresh GPS location:",
        error
      );

      return null;
    }
  };

export const saveCurrentLocation = async () => {
  try {
    // Location permission
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      console.log("Location permission denied");
      return false;
    }

    // Current GPS location
    const currentLocation =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

    const latitude =
      currentLocation.coords.latitude;

    const longitude =
      currentLocation.coords.longitude;

    const userId = auth.currentUser?.uid;

    if (!userId) {
      console.log("User not logged in");
      return false;
    }

    // Save location in backend database user document
    await updateDoc(
      doc(db, "users", userId),
      {
        latitude: latitude,
        longitude: longitude,
      }
    );

    console.log("Location saved:", {
      latitude,
      longitude,
    });

    return true;
  } catch (error) {
    console.error(
      "Error saving current location:",
      error
    );

    return false;
  }
};
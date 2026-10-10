import * as Location from 'expo-location';
import { emergencyInsights } from './emergencyInsightsService';

let watcher: Location.LocationSubscription | null = null;
let busy = false;
let activeResponseId: string | null = null;

// Foreground-only, explicitly started by donor. Stops on screen unmount/logout.
export async function startEmergencyLocationSharing(responseId: string): Promise<boolean> {
  if (watcher && activeResponseId === responseId) return true;
  stopEmergencyLocationSharing();
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return false;
  activeResponseId = responseId;
  try {
    watcher = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 },
    async ({ coords }) => {
      if (busy) return;
      if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
      busy = true;
      try { await emergencyInsights.updateLocation(responseId, coords.latitude, coords.longitude); }
      catch (e) { console.warn('Emergency location upload failed:', e); }
      finally { busy = false; }
    },
    );
    return true;
  } catch (error) {
    activeResponseId = null;
    throw error;
  }
}

export function stopEmergencyLocationSharing() {
  watcher?.remove();
  watcher = null;
  activeResponseId = null;
}

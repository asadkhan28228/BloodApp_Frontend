import * as Location from 'expo-location';
import { emergencyInsights } from './emergencyInsightsService';

let watcher: Location.LocationSubscription | null = null;
let busy = false;
let activeResponseId: string | null = null;
let generation = 0;

async function uploadPosition(responseId: string, coords: { latitude: number; longitude: number }, token: number) {
  if (token !== generation || activeResponseId !== responseId || busy) return;
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
  busy = true;
  try {
    await emergencyInsights.updateLocation(responseId, coords.latitude, coords.longitude);
  } catch (error) {
    console.warn('Emergency location upload failed:', error);
  } finally {
    busy = false;
  }
}

// Call only after donor explicitly presses START JOURNEY.
export async function startEmergencyLocationSharing(responseId: string): Promise<boolean> {
  if (watcher && activeResponseId === responseId) return true;
  stopEmergencyLocationSharing();
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return false;
  const token = ++generation;
  activeResponseId = responseId;
  try {
    // Send an initial GPS fix immediately rather than waiting for movement.
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (token !== generation) return false;
    await uploadPosition(responseId, initial.coords, token);
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 },
      ({ coords }) => { void uploadPosition(responseId, coords, token); },
    );
    if (token !== generation) { subscription.remove(); return false; }
    watcher = subscription;
    return true;
  } catch (error) {
    if (token === generation) stopEmergencyLocationSharing();
    throw error;
  }
}

export function stopEmergencyLocationSharing() {
  generation++;
  watcher?.remove();
  watcher = null;
  activeResponseId = null;
}

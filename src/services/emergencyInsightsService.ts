import { apiRequest } from '../lib/api';

// API routes supplied by EmergencyInsightsController in the backend patch.
export const emergencyInsights = {
  nearbyDonors: (emergencyId: string) =>
    apiRequest<any>(`/api/emergency-insights/${encodeURIComponent(emergencyId)}/nearby-donors`),
  commandCenter: (emergencyId: string) =>
    apiRequest<any>(`/api/emergency-insights/${encodeURIComponent(emergencyId)}/command-center`),
  donorEta: (responseId: string) =>
    apiRequest<any>(`/api/emergency-insights/responses/${encodeURIComponent(responseId)}/eta`),
  updateLocation: (responseId: string, latitude: number, longitude: number) =>
    apiRequest<any>(`/api/emergency-responses/${encodeURIComponent(responseId)}/location`, {
      method: 'PUT', body: JSON.stringify({ latitude, longitude }),
    }),
};

export function asItems(value: any): any[] {
  if (Array.isArray(value)) return value;
  for (const key of ['donors', 'nearbyDonors', 'responses', 'items', 'data']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

export function safeText(value: any): string {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { emergencyInsights, asItems } from '../services/emergencyInsightsService';
import { startEmergencyLocationSharing, stopEmergencyLocationSharing } from '../services/emergencyLocationSharing';
import { apiRequest } from '../lib/api';

const RED = '#dc2626';
const BG = '#f8fafc';
const text = (v: any, fallback = 'Not available') => v === undefined || v === null || v === '' ? fallback : String(v);
const num = (v: any): number | null => v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const coord = (v: any) => {
  const latitude = num(v?.latitude ?? v?.lat ?? v?.donorLatitude ?? v?.currentLatitude);
  const longitude = num(v?.longitude ?? v?.lng ?? v?.lon ?? v?.donorLongitude ?? v?.currentLongitude);
  return latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
};
const first = (...values: any[]) => values.find(v => v !== null && v !== undefined && v !== '');
const norm = (v: any) => String(v ?? '').trim().toLowerCase().replace(/[\s_-]/g, '');
const stage = (status: any) => {
  const s = norm(status);
  if (['completed', 'complete', 'resolved'].includes(s)) return 4;
  if (['arrived', 'reached'].includes(s)) return 3;
  if (['ontheway', 'journeystarted', 'travelling'].includes(s)) return 2;
  if (['accepted', 'pending', 'responded'].includes(s)) return 1;
  return 0;
};
const timeValue = (v: any) => {
  if (!v) return null;
  const raw = typeof v === 'string' && !/(Z|[+-]\d\d:\d\d)$/i.test(v) ? `${v}Z` : v;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};
const steps = [
  { title: 'Emergency Reported', subtitle: 'Emergency request created', icon: 'alert-circle' },
  { title: 'Donor Accepted', subtitle: 'Donor responding', icon: 'person-add' },
  { title: 'On The Way', subtitle: 'Donor journey started', icon: 'navigate' },
  { title: 'Arrived', subtitle: 'Donor reached emergency location', icon: 'location' },
  { title: 'Completed', subtitle: 'Emergency response completed', icon: 'checkmark-circle' },
] as const;

function Panel({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: 'white', borderRadius: 22, padding: 19, marginBottom: 17, borderWidth: 1, borderColor: '#edf0f5' }}>{children}</View>;
}
function Title({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return <View style={{ marginBottom: 18 }}><Text style={{ fontSize: 19, fontWeight: '800', color: '#111827' }}>{children}</Text>{subtitle ? <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 5 }}>{subtitle}</Text> : null}</View>;
}
function Stat({ label, value }: { label: string; value: any }) {
  return <View style={{ flex: 1, backgroundColor: '#ffffff24', borderRadius: 15, padding: 12, marginHorizontal: 3 }}><Text style={{ color: '#ffe4e6', fontSize: 10, fontWeight: '800' }}>{label}</Text><Text style={{ color: 'white', fontWeight: '900', fontSize: 21, marginTop: 6 }}>{text(value, '—')}</Text></View>;
}
export default function EmergencyInsightsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ emergencyId?: string; responseId?: string }>();
  const emergencyId = Array.isArray(params.emergencyId) ? params.emergencyId[0] : params.emergencyId;
  const responseId = Array.isArray(params.responseId) ? params.responseId[0] : params.responseId;
  const [center, setCenter] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [eta, setEta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const reload = useCallback(async (silent = false) => {
    if (!emergencyId) { setError('Emergency ID missing. Open tracking from an emergency request.'); setLoading(false); return; }
    if (!silent) setRefreshing(true);
    const results = await Promise.allSettled([
      emergencyInsights.commandCenter(emergencyId),
      apiRequest<any[]>(`/api/emergencies/${encodeURIComponent(emergencyId)}/responses`),
      responseId ? emergencyInsights.donorEta(responseId) : Promise.resolve(null),
    ]);
    if (results[0].status === 'fulfilled') setCenter(results[0].value);
    if (results[1].status === 'fulfilled') setResponses(asItems(results[1].value));
    if (results[2].status === 'fulfilled') setEta(results[2].value);
    const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
    setError(failed ? text(failed.reason?.message, 'Some tracking data could not be loaded.') : '');
    setLoading(false); setRefreshing(false);
  }, [emergencyId, responseId]);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => { setNow(Date.now()); void reload(true); }, 10000);
    return () => clearInterval(timer);
  }, [reload]);

  const root = center?.emergency ?? center?.emergencyRequest ?? center?.request ?? center ?? {};
  const nested = asItems(center?.responses ?? center?.donorResponses ?? center?.responders);
  const allResponses = responses.length ? responses : nested;
  const current = allResponses.find((r: any) => String(r.id) === String(responseId)) ??
    allResponses.find((r: any) => !['rejected', 'cancelled'].includes(norm(r.status))) ?? allResponses[0] ?? {};
  const status = first(current.status, root.responseStatus, center?.currentResponseStatus, 'Pending');
  const progress = stage(status);
  const startedAt = timeValue(first(root.createdAt, center?.createdAt));
  const elapsed = startedAt === null ? '—' : (() => { const secs = Math.max(0, Math.floor((now - startedAt) / 1000)); return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; })();
  const responderCount = first(root.respondingDonorsCount, center?.respondingDonorsCount, allResponses.length);
  const donorGps = coord(first(current.location, current.lastLocation, current.coordinates, eta?.donorLocation, eta?.location, current));
  const destinationGps = coord(first(root.destination, root.emergencyLocation, root.coordinates, root));
  const gpsTime = first(current.locationUpdatedAt, current.lastLocationAt, current.updatedAt, eta?.lastUpdatedAt);
  const locationLabel = donorGps ? 'Showing donor’s last reported GPS position' : 'Donor GPS position not available yet';
  const etaLabel = first(eta?.estimatedMinutes != null ? `${eta.estimatedMinutes} min` : null, eta?.etaMinutes != null ? `${eta.etaMinutes} min` : null, eta?.estimatedArrivalMinutes != null ? `${eta.estimatedArrivalMinutes} min` : null);
  const completed = progress === 4 || ['resolved', 'completed'].includes(norm(root.status));
  const canShare = !!responseId && progress >= 2 && progress < 3 && !completed;
  const centerPoint = donorGps ?? destinationGps;

  const startSharing = async () => {
    if (!responseId) return;
    try {
      const granted = await startEmergencyLocationSharing(responseId);
      setSharing(!!granted);
      if (!granted) Alert.alert('GPS Permission', 'Please allow foreground location access to share your journey.');
    } catch (e: any) { Alert.alert('Tracking error', text(e?.message, 'Could not start GPS sharing.')); }
  };

  return <View style={{ flex: 1, backgroundColor: BG }}>
    <View style={{ backgroundColor: 'white', paddingHorizontal: 18, paddingTop: 15, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
      <TouchableOpacity onPress={() => router.back()} style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}><Ionicons name="arrow-back" size={23} color="#0f172a" /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 19, fontWeight: '900', color: '#111827' }}>Emergency Tracking</Text><Text style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}><Text style={{ color: completed ? '#94a3b8' : '#22c55e' }}>●</Text> {completed ? 'COMPLETED' : 'UPDATING'} · {emergencyId ? `EMG-${emergencyId.slice(0, 13)}` : 'No emergency selected'}</Text></View>
      <View style={{ backgroundColor: '#fff1f2', padding: 12, borderRadius: 14 }}><Ionicons name="pulse" color={RED} size={23}/></View>
    </View>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />} contentContainerStyle={{ padding: 16, paddingBottom: 45 }}>
      {loading && !center ? <ActivityIndicator color={RED} style={{ marginVertical: 30 }} /> : null}
      {error ? <Text style={{ color: RED, marginBottom: 12 }}>{error}</Text> : null}
      <View style={{ backgroundColor: '#dc0716', borderRadius: 25, padding: 22, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 10 }}><Text style={{ color: 'white', backgroundColor: '#ffffff2c', alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 7, fontSize: 11, fontWeight: '800' }}>{text(first(root.priority, root.urgency), 'URGENT').toUpperCase()} PRIORITY</Text><Text style={{ color: 'white', fontSize: 27, fontWeight: '900', marginTop: 17 }}>{text(first(root.category, root.emergencyType, root.reporterName, root.patientName), 'Emergency')}</Text><Text style={{ color: '#ffe4e6', marginTop: 6 }}>{text(first(root.location, root.address, root.hospitalName))}</Text></View>
          <View style={{ backgroundColor: 'white', padding: 13, borderRadius: 19, alignItems: 'center', minWidth: 72 }}><Text style={{ color: RED, fontSize: 23, fontWeight: '900' }}>{text(first(root.bloodType, root.bloodGroup), '—')}</Text><Text style={{ color: '#64748b', fontSize: 10, fontWeight: '800' }}>BLOOD</Text></View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 22, marginHorizontal: -3 }}><Stat label="UNITS" value={first(root.unitsNeeded, root.units, root.requiredUnits)} /><Stat label="RESPONDERS" value={responderCount} /><Stat label="ELAPSED" value={elapsed} /></View>
      </View>
      <Panel><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700' }}>CURRENT RESPONSE</Text><Text style={{ fontSize: 24, color: '#0f172a', fontWeight: '900', marginTop: 9 }}>{text(status)}</Text></View><View style={{ backgroundColor: completed ? '#dcfce7' : '#fee2e2', borderRadius: 20, padding: 12 }}><Ionicons name={completed ? 'checkmark-circle' : 'pulse'} color={completed ? '#16a34a' : RED} size={30}/></View></View></Panel>
      <Panel><Title subtitle="Updates automatically as the donor progresses">Response Timeline</Title>
        {steps.map((item, i) => { const reached = i === 0 || progress >= i; return <View key={item.title} style={{ flexDirection: 'row', minHeight: i === steps.length - 1 ? 62 : 105 }}><View style={{ alignItems: 'center', width: 53 }}><View style={{ backgroundColor: reached ? RED : '#e2e8f0', width: 49, height: 49, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon as any} size={22} color={reached ? 'white' : '#94a3b8'}/></View>{i < steps.length - 1 ? <View style={{ backgroundColor: reached && progress > i ? RED : '#e2e8f0', width: 3, flex: 1 }} /> : null}</View><View style={{ paddingLeft: 16, paddingTop: 7, flex: 1 }}><Text style={{ color: reached ? '#111827' : '#94a3b8', fontWeight: '800', fontSize: 15 }}>{item.title}</Text><Text style={{ color: '#94a3b8', marginTop: 7, fontSize: 12 }}>{item.subtitle}</Text></View></View>; })}
      </Panel>
      <Panel><Title subtitle="Donor position updates when GPS sharing is active">Live Location & Tracking</Title>
        {centerPoint ? <View style={{ borderRadius: 17, overflow: 'hidden' }}><MapView style={{ height: 275, width: '100%' }} initialRegion={{ ...centerPoint, latitudeDelta: 0.025, longitudeDelta: 0.025 }}><Marker coordinate={centerPoint} title={donorGps ? 'Donor last known position' : 'Emergency location'} pinColor={donorGps ? '#2563eb' : RED}/>{donorGps && destinationGps ? <Marker coordinate={destinationGps} title="Emergency destination" pinColor={RED}/> : null}</MapView></View> : <View style={{ backgroundColor: '#f1f5f9', height: 160, borderRadius: 15, alignItems: 'center', justifyContent: 'center', padding: 18 }}><Ionicons name="location-outline" size={32} color="#94a3b8"/><Text style={{ color: '#64748b', textAlign: 'center', marginTop: 10 }}>Waiting for valid GPS coordinates from the API</Text></View>}
        {etaLabel && !completed ? <Text style={{ color: '#1e293b', fontWeight: '800', marginTop: 12 }}>Estimated arrival: {etaLabel}</Text> : null}
        <Text style={{ color: '#64748b', marginTop: 12, fontSize: 12 }}><Ionicons name="location-outline" size={14}/> {locationLabel}</Text>
        {gpsTime && donorGps ? <Text style={{ color: '#94a3b8', marginTop: 5, fontSize: 11 }}>Last update: {text(gpsTime)}</Text> : null}
        {canShare ? <TouchableOpacity onPress={sharing ? () => { stopEmergencyLocationSharing(); setSharing(false); } : () => void startSharing()} style={{ backgroundColor: sharing ? '#475569' : '#2563eb', borderRadius: 14, padding: 15, marginTop: 15 }}><Text style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>{sharing ? 'Stop GPS Sharing' : 'Start Foreground GPS Sharing'}</Text></TouchableOpacity> : null}
      </Panel>
      <Panel><Title>Active Responder</Title><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 55, height: 55, borderRadius: 28, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}><Ionicons name="person" color={RED} size={26}/></View><View style={{ flex: 1 }}><Text style={{ color: '#0f172a', fontSize: 17, fontWeight: '800' }}>{text(first(current.donorName, current.fullName, current.name), allResponses.length ? 'Responder' : 'No responder yet')}</Text><Text style={{ color: '#64748b', marginTop: 5 }}>{allResponses.length ? text(status) : 'Waiting for a donor'}</Text></View><Text style={{ color: RED, fontWeight: '900' }}>{text(first(current.bloodType, current.bloodGroup), '')}</Text></View>
        {completed ? <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', borderRadius: 15, padding: 15, marginTop: 18 }}><Ionicons name="checkmark-circle" color="#16a34a" size={22}/><Text style={{ color: '#15803d', fontWeight: '800', marginLeft: 10 }}>Emergency Response Completed</Text></View> : null}
      </Panel>
      <Panel><Title subtitle="Current source and bank status">Blood Support</Title><View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}><Text style={{ color: '#64748b' }}>Blood Source</Text><Text style={{ fontWeight: '800', color: '#0f172a' }}>{text(first(root.bloodSource, center?.bloodSource))}</Text></View><View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}><Text style={{ color: '#64748b' }}>Bank Status</Text><Text style={{ fontWeight: '800', color: '#0f172a' }}>{text(first(root.bankStatus, center?.bankStatus, root.reservedUnits > 0 ? 'Reserved' : 'Not Required'))}</Text></View></Panel>
    </ScrollView>
  </View>;
}

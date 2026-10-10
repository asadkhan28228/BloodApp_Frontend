import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { emergencyInsights, asItems, safeText } from '../services/emergencyInsightsService';
import { startEmergencyLocationSharing, stopEmergencyLocationSharing } from '../services/emergencyLocationSharing';
import { apiRequest } from '../lib/api';

function Info({ label, value }: { label: string; value: any }) {
  return <View style={{ marginBottom: 10 }}><Text style={{ color: '#64748b', fontSize: 12 }}>{label}</Text><Text style={{ color: '#0f172a', fontWeight: '600' }}>{safeText(value)}</Text></View>;
}
const Button = ({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) => (
  <TouchableOpacity onPress={onPress} style={{ padding: 13, backgroundColor: danger ? '#475569' : '#b91c1c', borderRadius: 12, marginBottom: 10 }}>
    <Text style={{ textAlign: 'center', color: 'white', fontWeight: '700' }}>{label}</Text>
  </TouchableOpacity>
);
export default function EmergencyInsightsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ emergencyId?: string; responseId?: string }>();
  const emergencyId = Array.isArray(params.emergencyId) ? params.emergencyId[0] : params.emergencyId;
  const responseId = Array.isArray(params.responseId) ? params.responseId[0] : params.responseId;
  const [manualId, setManualId] = useState(emergencyId || "");
  const activeEmergencyId = emergencyId || manualId.trim();
  const [center, setCenter] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [eta, setEta] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const reload = useCallback(async () => {
    if (!activeEmergencyId && !responseId) return;
    setLoading(true); setError('');
    const tasks: Promise<void>[] = [];
    if (activeEmergencyId) {
      tasks.push(emergencyInsights.commandCenter(activeEmergencyId).then(setCenter));
      tasks.push(emergencyInsights.nearbyDonors(activeEmergencyId).then(v => setDonors(asItems(v))));
    }
    if (responseId) tasks.push(emergencyInsights.donorEta(responseId).then(setEta));
    const outcomes = await Promise.allSettled(tasks);
    if (outcomes.some(x => x.status === 'rejected')) {
      const failed = outcomes.find(x => x.status === 'rejected') as PromiseRejectedResult | undefined;
      setError(failed?.reason?.message || 'Some emergency data could not be loaded.');
    }
    setLoading(false);
  }, [activeEmergencyId, responseId]);

  useEffect(() => { void reload(); }, [reload]);
  const start = async () => {
    if (!responseId) { Alert.alert('Response required', 'Open this screen with your emergency response ID.'); return; }
    try {
      const granted = await startEmergencyLocationSharing(responseId);
      setSharing(granted);
      if (!granted) Alert.alert('Permission needed', 'Enable foreground location permission to share GPS.');
    } catch (e: any) { Alert.alert('Tracking error', e?.message || 'Could not start location sharing.'); }
  };
  return <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 18, paddingTop: 50 }}>
    <TouchableOpacity onPress={() => router.back()}><Text style={{ color: '#b91c1c', fontWeight: '700', marginBottom: 15 }}>← Back</Text></TouchableOpacity>
    <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 6 }}>Emergency Insights</Text>
    <Text style={{ color: '#64748b', marginBottom: 18 }}>Live data is loaded from your ASP.NET Core API. Pull to refresh.</Text>
    {!emergencyId ? <TextInput placeholder="Enter emergency ID" value={manualId} onChangeText={setManualId} autoCapitalize="none" style={{ backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#cbd5e1' }}/> : <Info label="Emergency ID" value={emergencyId}/>}
    {responseId ? <Info label="My Response ID" value={responseId}/> : null}
    <Button label={loading ? 'Refreshing...' : 'Refresh insights'} onPress={() => void reload()} />
    {loading ? <ActivityIndicator color="#b91c1c"/> : null}
    {error ? <Text style={{ color: '#b91c1c', marginVertical: 12 }}>{error}</Text> : null}
    {activeEmergencyId ? <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginVertical: 12 }}>
      <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 12 }}>Command Center</Text>
      {center ? Object.entries(center).filter(([_, v]) => typeof v !== 'object' || v === null).map(([k,v]) => <Info key={k} label={k} value={v}/>) : <Text>No command center data yet.</Text>}
      {center && asItems(center).length ? asItems(center).map((r:any, i:number) => <View key={String(r.id ?? i)} style={{ borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 8 }}><Info label="Response" value={`${safeText(r.donorName ?? r.name)} · ${safeText(r.status)}`}/></View>) : null}
    </View> : null}
    {activeEmergencyId ? <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginVertical: 12 }}>
      <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 12 }}>Nearby Donors ({donors.length})</Text>
      {donors.length ? donors.map((d:any,i:number) => <View key={String(d.id ?? i)} style={{ borderBottomWidth: 1, borderColor: '#e2e8f0', paddingVertical: 10 }}>
        <Info label="Donor" value={d.fullName ?? d.donorName ?? d.name}/>
        <Info label="Blood Group" value={d.bloodType ?? d.bloodGroup}/>
        <Info label="Distance" value={d.distanceKm != null ? `${d.distanceKm} km` : (d.distance ?? 'Not available')}/>
      </View>) : <Text style={{ color: '#64748b' }}>No matching donors returned.</Text>}
    </View> : null}
    {responseId ? <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginVertical: 12 }}>
      <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 12 }}>Donor ETA</Text>
      {eta ? Object.entries(eta).map(([k,v]) => <Info key={k} label={k} value={v}/>) : <Text>ETA unavailable.</Text>}
      <Text style={{ color: '#64748b', fontSize: 12, marginVertical: 10 }}>ETA is approximate, not traffic-aware.</Text>
      <Button label={sharing ? 'GPS sharing active' : 'Start foreground GPS sharing'} onPress={() => void start()}/>
      {sharing ? <Button label="Stop GPS sharing" danger onPress={() => { stopEmergencyLocationSharing(); setSharing(false); }}/> : null}
    </View> : null}
  </ScrollView>;
}

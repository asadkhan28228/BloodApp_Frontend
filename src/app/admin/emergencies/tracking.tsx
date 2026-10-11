import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL, getAccessToken } from "../../../lib/api";
import { emergencyInsights, asItems, safeText } from "../../../services/emergencyInsightsService";

const label = (v: unknown) => safeText(v);
const pick = (v: any, ...keys: string[]) => keys.map(k => v?.[k]).find(x => x !== undefined && x !== null);

export default function AdminEmergencyTracking() {
  const router = useRouter();
  const params = useLocalSearchParams<{ emergencyId?: string }>();
  const emergencyId = Array.isArray(params.emergencyId) ? params.emergencyId[0] : params.emergencyId;
  const [center, setCenter] = useState<any>(null);
  const [nearby, setNearby] = useState<any[]>([]);
  const [etas, setEtas] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");

  const refresh = useCallback(async () => {
    if (!emergencyId) return;
    setLoading(true);
    const [c, n] = await Promise.allSettled([
      emergencyInsights.commandCenter(emergencyId),
      emergencyInsights.nearbyDonors(emergencyId),
    ]);
    if (c.status === "fulfilled") {
      setCenter(c.value);
      const responses = asItems(c.value);
      const ids = responses.map((r: any) => String(pick(r, "responseId", "id", "Id") ?? "")).filter(Boolean);
      const results = await Promise.allSettled(ids.map(id => emergencyInsights.donorEta(id)));
      const next: Record<string, any> = {};
      results.forEach((r, i) => { if (r.status === "fulfilled") next[ids[i]] = r.value; });
      setEtas(next);
    }
    if (n.status === "fulfilled") setNearby(asItems(n.value));
    if (c.status === "rejected" || n.status === "rejected") {
      const reason = c.status === "rejected" ? c.reason : n.status === "rejected" ? n.reason : null;
      setError(reason?.message || "Could not load all emergency information.");
    } else setError("");
    setLastUpdate(new Date().toLocaleTimeString());
    setLoading(false);
  }, [emergencyId]);

  useEffect(() => {
    void refresh();
    // Polling fallback keeps the dashboard updated even if the hub event name differs.
    const interval = setInterval(() => { void refresh(); }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    let active = true;
    let hub: signalR.HubConnection | undefined;
    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!token || !active) return;
        hub = new signalR.HubConnectionBuilder()
          .withUrl(`${API_BASE_URL}/notificationHub`, { accessTokenFactory: () => token })
          .withAutomaticReconnect()
          .build();
        // Refresh authoritative API data when a location/status notification arrives.
        for (const event of ["DonorLocationUpdated", "EmergencyLocationUpdated", "ReceiveEmergencyLocation", "LocationUpdated", "ReceiveNotification"]) {
          hub.on(event, () => { if (active) void refresh(); });
        }
        await hub.start();
      } catch (e) {
        console.warn("Live tracking hub unavailable; 15-second refresh remains active", e);
      }
    };
    void connect();
    return () => { active = false; if (hub) void hub.stop().catch(() => {}); };
  }, [refresh]);

  const responses = asItems(center);
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center border-b border-gray-200 bg-white px-5 py-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 rounded-xl bg-gray-100 p-3"><Ionicons name="arrow-back" size={20} color="#111827" /></TouchableOpacity>
        <View className="flex-1"><Text className="text-xl font-black text-gray-900">Emergency Live Tracking</Text><Text className="text-xs text-gray-500">{emergencyId || "No emergency ID"}</Text></View>
        <TouchableOpacity onPress={() => void refresh()}><Ionicons name="refresh" size={22} color="#B91C1C" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 45 }}>
        {loading && <ActivityIndicator color="#B91C1C" />}
        {!!error && <Text className="mb-3 rounded-xl bg-red-50 p-3 text-red-700">{error}</Text>}
        <Text className="mb-3 text-xs text-gray-500">Updated: {lastUpdate || "Waiting"} · Auto refresh every 15 seconds</Text>
        <View className="mb-4 rounded-2xl bg-white p-4">
          <Text className="mb-3 text-lg font-black text-gray-900">Command Center</Text>
          {center ? Object.entries(center).filter(([_,v]) => v === null || typeof v !== "object").map(([k,v]) => (
            <Text key={k} className="mb-2 text-sm text-gray-700">{k}: <Text className="font-bold">{label(v)}</Text></Text>
          )) : <Text className="text-gray-500">No data loaded.</Text>}
        </View>
        <View className="mb-4 rounded-2xl bg-white p-4">
          <Text className="mb-3 text-lg font-black text-gray-900">Responding Donors ({responses.length})</Text>
          {responses.length === 0 && <Text className="text-gray-500">No responses returned.</Text>}
          {responses.map((r: any, i) => {
            const id = String(pick(r, "responseId", "id", "Id") ?? "");
            const eta = etas[id];
            return <View key={id || String(i)} className="mb-3 rounded-xl border border-gray-100 p-3">
              <Text className="font-bold text-gray-900">{label(pick(r,"donorName","fullName","name") ?? `Donor ${i+1}`)}</Text>
              <Text className="mt-1 text-gray-600">Status: {label(pick(r,"status","Status"))}</Text>
              <Text className="mt-1 text-gray-600">Location: {label(pick(r,"latitude","Latitude"))}, {label(pick(r,"longitude","Longitude"))}</Text>
              <Text className="mt-1 text-gray-600">ETA: {eta ? label(pick(eta,"etaMinutes","estimatedMinutes","estimatedArrivalMinutes","eta") ?? eta) : "Not available"}</Text>
              <Text className="mt-1 text-xs text-gray-400">Coordinates are last reported, not a live map.</Text>
            </View>;
          })}
        </View>
        <View className="rounded-2xl bg-white p-4">
          <Text className="mb-3 text-lg font-black text-gray-900">Nearby Donors ({nearby.length})</Text>
          {nearby.length === 0 && <Text className="text-gray-500">No nearby donors returned.</Text>}
          {nearby.map((d: any,i) => <View key={String(pick(d,"id","userId") ?? i)} className="border-b border-gray-100 py-3">
            <Text className="font-bold text-gray-900">{label(pick(d,"fullName","donorName","name"))}</Text>
            <Text className="text-sm text-gray-600">Blood: {label(pick(d,"bloodType","bloodGroup"))} · Distance: {label(pick(d,"distanceKm","distance"))} km</Text>
          </View>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

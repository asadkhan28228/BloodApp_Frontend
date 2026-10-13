import Donorcard from "@/src/components/donorcard";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { collection, getDocs } from "@/src/lib/backendCompat";
import { apiRequest, API_BASE_URL, getAccessToken } from "@/src/lib/api";
import * as signalR from "@microsoft/signalr";
import { db } from "../../../config/backendConfig";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLOOD_TYPE_FILTERS = ["All", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// Keep the donor list in component memory when revisiting this tab.
const CACHE_TTL_MS = 0; // Always fetch current availability on focus

const Donors = () => {
  const router = useRouter();
  const [donors, setDonors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBloodType, setSelectedBloodType] = useState("All");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);
  const cacheUpdatedAt = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);

  const filteredDonors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return donors.filter((donor) => {
      const matchesBlood = selectedBloodType === "All" || donor.bloodType === selectedBloodType;
      const matchesSearch = !q || [donor.fullName, donor.phoneNumber, donor.bloodType, donor.location]
        .some((value) => String(value ?? "").toLowerCase().includes(q));
      return matchesBlood && matchesSearch;
    });
  }, [donors, searchQuery, selectedBloodType]);

  const handleCall = (phoneNumber: string, name: string) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not available for this donor.");
      return;
    }
    const sanitizedNumber = phoneNumber.replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${sanitizedNumber}`).catch(() =>
      Alert.alert("Error", "Phone calls are not supported on this device or the dialer could not be opened.")
    );
  };

  const fetchDonors = useCallback(async () => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      // Profile and donor collection load concurrently on first visit.
      const profilePromise = currentUserIdRef.current
        ? Promise.resolve(currentUserIdRef.current)
        : apiRequest<any>("/api/auth/profile").then((response) => {
            const profile = response?.data ?? response;
            const id = String(profile?.id ?? profile?.Id ?? "").toLowerCase();
            if (!id) throw new Error("Logged-in user ID was not found.");
            currentUserIdRef.current = id;
            return id;
          });
      const [currentUserId, querySnapshot] = await Promise.all([
        profilePromise,
        getDocs(collection(db, "users")),
      ]);
      const nextDonors: any[] = [];
      querySnapshot.forEach((doc: any) => {
        const donor = doc.data();
        const role = String(donor.role ?? "").toLowerCase();
        const id = String(doc.id).toLowerCase();
        const donorId = String(donor.id ?? donor.Id ?? "").toLowerCase();
        if (donor.availableToDonate === true && donor.isActive !== false && role !== "admin" && role !== "bloodbankadmin" && id !== currentUserId && donorId !== currentUserId) {
          nextDonors.push({ ...donor, id: doc.id });
        }
      });
      if (requestId.current !== thisRequest) return;
      cacheUpdatedAt.current = Date.now();
      setDonors(nextDonors);
    } catch (error) {
      if (requestId.current !== thisRequest) return;
      console.error("Error fetching donors:", error);
      setLoadError(true);
    } finally {
      if (requestId.current === thisRequest) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    // Reuse recent results when switching tabs. Refresh when cache gets old.
    if (!cacheUpdatedAt.current || Date.now() - cacheUpdatedAt.current > CACHE_TTL_MS) {
      fetchDonors();
    }
    return () => { requestId.current += 1; };
  }, [fetchDonors]));

  // Instant availability events while Find Donors is open.
  useFocusEffect(useCallback(() => {
    let disposed = false;
    let hub: signalR.HubConnection | null = null;
    let starting: Promise<void> | null = null;
    const onAvailability = () => { if (!disposed) void fetchDonors(); };
    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!token || disposed) return;
        const c = new signalR.HubConnectionBuilder()
          .withUrl(`${API_BASE_URL}/notificationHub`, {
            accessTokenFactory: async () => (await getAccessToken()) || token,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(signalR.LogLevel.Warning)
          .build();
        hub = c;
        c.on("DonorAvailabilityUpdated", onAvailability);
        c.onreconnected(onAvailability);
        starting = c.start();
        await starting;
        if (disposed) await c.stop();
        else onAvailability();
      } catch (error) {
        if (!disposed) console.warn("Donor SignalR unavailable; fallback refresh active:", error);
      }
    };
    void connect();
    // Safety fallback when hosting or network drops SignalR.
    const timer = setInterval(onAvailability, 5000);
    return () => {
      disposed = true;
      clearInterval(timer);
      if (hub) {
        const c = hub;
        c.off("DonorAvailabilityUpdated", onAvailability);
        void (async () => {
          if (starting) await starting.catch(() => undefined);
          if (c.state !== signalR.HubConnectionState.Disconnected) await c.stop();
        })().catch(() => undefined);
      }
    };
  }, [fetchDonors]));

  const handleSearch = (query: string) => setSearchQuery(query);
  const handleBloodTypeFilter = (bloodType: string) => setSelectedBloodType(bloodType);

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FB]"
      edges={["top"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8F9FB"
      />
      <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: 120,
          }}
        >
          <View className="px-5 pt-2">
              <View className="flex-row items-center">
                <Text className="text-[25px] font-black tracking-tight text-gray-900">
                  Find{" "}
                </Text>
                <Text className="text-[25px] font-black tracking-tight text-red-600">
                  Donors
                </Text>
              </View>
              <Text className="mt-0.5 text-[12px] font-medium text-gray-500">
                {filteredDonors.length}{" "}
                {filteredDonors.length === 1 ? "donor" : "donors"} available near you
              </Text>
            </View>
          <View className="px-5 pt-5">
          <View
            className="h-[50px] flex-row items-center rounded-2xl border border-gray-200 bg-white px-4"
            style={{
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.04,
              shadowRadius: 5,
              elevation: 2,
            }}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color="#DC2626"
            />
            <TextInput
              className="ml-3 flex-1 text-[12px] font-medium text-gray-800"
              placeholder="Search donors by name, blood type, location"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery !== "" ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSearch("")}
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons
                  name="options-outline"
                  size={20}
                  color="#DC2626"
                />
              </TouchableOpacity>
            )}
          </View>
          </View>
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{
                paddingHorizontal: 20,
                gap: 7,
              }}
            >
              {BLOOD_TYPE_FILTERS.map((type) => {
                const active = selectedBloodType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    onPress={() => handleBloodTypeFilter(type)}
                    className={`h-9 min-w-[42px] items-center justify-center rounded-full px-3 ${
                      active ? "bg-red-600" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-[12px] font-extrabold ${
                        active ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
          <View className="mt-5 flex-row items-center justify-between px-5">
            <Text className="text-[14px] font-medium text-gray-500">
              {filteredDonors.length}{" "}
              {filteredDonors.length === 1
                ? "donor"
                : "donors"}{" "}
              found
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center"
            >
              <Ionicons
                name="swap-vertical-outline"
                size={18}
                color="#111827"
              />
              <Text className="ml-1.5 text-[14px] font-extrabold text-gray-800">
                Nearest First
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color="#111827"
                style={{
                  marginLeft: 3,
                }}
              />
            </TouchableOpacity>
          </View>
          {loading && <View className="flex-row items-center px-5 mt-3"><ActivityIndicator size="small" color="#E11D2E" /><Text className="ml-2 text-xs text-gray-500">Updating donors...</Text></View>}
          {loadError && <TouchableOpacity className="mx-5 mt-3 rounded-xl bg-red-50 p-3" onPress={fetchDonors}><Text className="text-red-600">Could not refresh donors. Tap to retry.</Text></TouchableOpacity>}
          <View className="mt-4">
            {filteredDonors.length > 0 ? (
              filteredDonors.map(
                (donor) => (
                  <Donorcard
                    key={donor.id}
                    fullName={
                      donor.fullName
                    }
                    bloodType={
                      donor.bloodType
                    }
                    location={
                      donor.location ||
                      "Location unavailable"
                    }
                    donationsCount={
                      donor.donationsCount ||
                      0
                    }
                    isAvailable={
                      donor.availableToDonate !==
                      false
                    }
                    avatarUrl={
                      donor.avatarUrl
                    }
                    gender={
                      donor.gender
                    }
                    distance={
                      donor.distance
                    }
                    latitude={
                      donor.latitude
                    }
                    longitude={
                      donor.longitude
                    }
                    onPress={() =>
                      router.push(
                        `/donor/${donor.id}` as any
                      )
                    }
                    onCallPress={() =>
                      handleCall(
                        donor.phoneNumber,
                        donor.fullName
                      )
                    }
                  />
                )
              )
            ) : (
              <View className="items-center justify-center px-5 py-20">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="people-outline"
                    size={38}
                    color="#CBD5E1"
                  />
                </View>
                <Text className="mt-4 text-[16px] font-extrabold text-gray-700">
                  {loading ? "Loading donors..." : loadError ? "Unable to load donors" : "No donors found"}
                </Text>
                <Text className="mt-1 text-center text-[13px] font-medium text-gray-400">
                  {loading ? "Fetching latest donor information" : loadError ? "Please check your connection and try again" : "Try searching with different criteria"}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
    </SafeAreaView>
  );
};
export default Donors;

import { db } from "@/src/config/backendConfig";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "@/src/lib/backendCompat";
import React, { useEffect, useState } from "react";
import Avatar from "@/src/components/Avatar";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStore } from "@/src/store/userStore";
import { calculateDistance } from "@/src/utils/distanceUtils";
import { getFreshGpsLocation } from "@/src/utils/locationService";

const DonorProfile = () => {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user: currentUserData } = useUserStore();
  const [donor, setDonor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonor = async () => {
      try {
        if (id) {
          const docRef = doc(db, "users", String(id));
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setDonor({ id: docSnap.id, ...docSnap.data() });
          } else {
            setDonor(null);
          }
        } else {
          setDonor(null);
        }
      } catch (error) {
        console.error("Error fetching donor:", error);
        setDonor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDonor();
  }, [id]);

  const [liveCurrentLocation, setLiveCurrentLocation] = useState<{
    latitude?: number;
    longitude?: number;
  }>({});

  useEffect(() => {
    const fetchCurrentLocation = async () => {
      const fresh = await getFreshGpsLocation();

      if (fresh) {
        setLiveCurrentLocation({
          latitude: fresh.latitude,
          longitude: fresh.longitude,
        });
      } else {
        setLiveCurrentLocation({
          latitude: currentUserData?.latitude,
          longitude: currentUserData?.longitude,
        });
      }
    };

    fetchCurrentLocation();
  }, [currentUserData?.latitude, currentUserData?.longitude]);

  const donorDistance =
    donor &&
    typeof liveCurrentLocation.latitude === "number" &&
    typeof liveCurrentLocation.longitude === "number" &&
    typeof donor.latitude === "number" &&
    typeof donor.longitude === "number"
      ? calculateDistance(
          liveCurrentLocation.latitude,
          liveCurrentLocation.longitude,
          donor.latitude,
          donor.longitude,
        )
      : null;

  const handleCall = () => {
    if (donor?.phoneNumber) {
      const sanitizedNumber = donor.phoneNumber.replace(/[^\d+]/g, "");
      const url = `tel:${sanitizedNumber}`;
      Linking.openURL(url).catch((err) => {
        console.error("An error occurred", err);
        Alert.alert(
          "Error",
          "Phone calls are not supported on this device or the dialer could not be opened.",
        );
      });
    } else {
      Alert.alert("Error", "Phone number not available.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!donor) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Ionicons name="alert-circle-outline" size={80} color="#D1D5DB" />
        <Text className="mt-4 text-xl font-bold text-gray-900">
          Donor Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 rounded-2xl bg-red-600 px-8 py-3"
        >
          <Text className="font-bold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <Stack.Screen options={{ title: donor?.fullName || "Donor Profile" }} />
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Header Card */}
        <View className="items-center mt-3 px-6 pb-8">
          <View className="relative">
            <View className="h-32 w-32 items-center justify-center rounded-full border-4 border-red-50 bg-gray-100 shadow-sm overflow-hidden">
              <Avatar
                name={donor.fullName}
                photoUrl={donor.avatarUrl}
                size={128}
                shape="circle"
              />
            </View>
            {/* Blood Type Badge - Moved to Top Right */}
            <View className="absolute z-10 -bottom-1 -right-1 h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-red-600 shadow-sm">
              <Text className="text-xs font-black text-white">
                {donor.bloodType}
              </Text>
            </View>
          </View>

          <View className="mt-2 flex-row items-center rounded-full bg-gray-50 px-4 py-1.5 border border-gray-100">
            <Ionicons name="location" size={14} color="#DC2626" />
            <Text className="ml-1.5 text-sm font-bold text-gray-500">
              {donor.location || "Location not set"}
            </Text>
          </View>

          {donorDistance !== null && (
            <View className="mt-3 rounded-full bg-orange-100 px-3 py-1.5">
              <Text className="text-xs font-black uppercase tracking-wider text-orange-700">
                {donorDistance.toFixed(1)} km away
              </Text>
            </View>
          )}

          <Text className=" text-sm font-bold text-gray-500 text-center">
            {donor.availableToDonate !== false ? "Avaliable" : "Not Avaliable"}
          </Text>
        </View>

        {/* Detailed Info Sections */}
        <View className="px-6 space-y-6 gap-6">
          <InfoSection title="Contact Information">
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={donor.phoneNumber}
              isCopyable
            />
          </InfoSection>

          <InfoSection title="Medical Information">
            <InfoRow
              icon="water-outline"
              label="Blood Group"
              value={donor.bloodType}
            />
            <InfoRow
              icon="calendar-outline"
              label="Last Donation"
              value={
                donor.lastDonationDate
                  ? new Date(
                      donor.lastDonationDate.seconds * 1000,
                    ).toLocaleDateString()
                  : "Never"
              }
            />
          </InfoSection>
        </View>

        <View className="h-10" />
      </ScrollView>

      <TouchableOpacity
        onPress={handleCall}
        className="flex-row items-center justify-center rounded-2xl bg-red-600 py-4 mx-6 mb-6 shadow-xl shadow-red-200"
      >
        <Ionicons name="call" size={20} color="white" />
        <Text className="ml-3 text-lg font-black text-white uppercase tracking-widest">
          Contact Donor
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const StatItem = ({ icon, label, value, color, bgColor }: any) => (
  <View
    className={`w-[30%] items-center rounded-3xl ${bgColor} p-4 border border-white`}
  >
    <Ionicons
      name={icon}
      size={20}
      color={color
        .replace("text-", "#")
        .replace("red-600", "DC2626")
        .replace("amber-500", "F59E0B")
        .replace("green-600", "16A34A")}
    />
    <Text className={`mt-2 text-lg font-black ${color}`}>{value}</Text>
    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
      {label}
    </Text>
  </View>
);

const InfoSection = ({ title, children }: any) => (
  <View>
    <Text className="mb-3 ml-1 text-xs font-black uppercase tracking-widest text-gray-400">
      {title}
    </Text>
    <View className="rounded-3xl bg-gray-50 p-5 border border-gray-100">
      {children}
    </View>
  </View>
);

const InfoRow = ({ icon, label, value, isCopyable }: any) => (
  <View className="flex-row items-center py-3">
    <View className="h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
      <Ionicons name={icon} size={16} color="#DC2626" />
    </View>
    <View className="ml-4 flex-1">
      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {label}
      </Text>
      <Text className="text-base font-bold text-gray-900">
        {value || "Not provided"}
      </Text>
    </View>
    {isCopyable && (
      <TouchableOpacity className="p-2">
        <Ionicons name="copy-outline" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    )}
  </View>
);

export default DonorProfile;
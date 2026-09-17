import Donorcard from "@/src/components/donorcard";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { collection, getDocs } from "@/src/lib/backendCompat";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/backendConfig";

const BLOOD_TYPE_FILTERS = [
  "All",
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
];

const Donors = () => {
  const router = useRouter();
  const [donors, setDonors] = useState<any[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBloodType, setSelectedBloodType] = useState("All");
  const [loading, setLoading] = useState(true);

  const handleCall = (phoneNumber: string, name: string) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not available for this donor.");
      return;
    }

    const sanitizedNumber = phoneNumber.replace(/[^\d+]/g, "");
    const url = `tel:${sanitizedNumber}`;

    Linking.openURL(url).catch((err) => {
      console.error("An error occurred", err);
      Alert.alert(
        "Error",
        "Phone calls are not supported on this device or the dialer could not be opened.",
      );
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchDonors();
    }, []),
  );

  const fetchDonors = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const donorsList: any[] = [];

      querySnapshot.forEach((doc) => {
        const donor = doc.data();
        const role = String(donor.role || "").toLowerCase();

        if (
          role !== "admin" &&
          role !== "bloodBankAdmin"
        ) {
          donorsList.push({ id: doc.id, ...donor });
        }
      });

      setDonors(donorsList);
      setFilteredDonors(donorsList);
    } catch (error) {
      console.error("Error fetching donors:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (query: string, bloodType: string) => {
    let filtered = donors;

    if (bloodType !== "All") {
      filtered = filtered.filter(
        (donor) => donor.bloodType === bloodType,
      );
    }

    if (query.trim() !== "") {
      const q = query.toLowerCase();

      filtered = filtered.filter((donor) => {
        return (
          donor.fullName?.toLowerCase().includes(q) ||
          donor.phoneNumber?.includes(q) ||
          donor.bloodType?.toLowerCase().includes(q) ||
          donor.location?.toLowerCase().includes(q)
        );
      });
    }

    setFilteredDonors(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedBloodType);
  };

  const handleBloodTypeFilter = (bloodType: string) => {
    setSelectedBloodType(bloodType);
    applyFilters(searchQuery, bloodType);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {loading ? (
        <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
          <ActivityIndicator size="large" color="#DC2626" />

          <Text className="mt-4 text-sm font-medium text-gray-400">
            Fetching Donors...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[1]}
        >
          {/* Header */}
          <View className="bg-[#F5F7FA] px-5 pb-4 pt-2">
            <Text className="text-[24px] font-extrabold text-gray-900">
              Find Donors
            </Text>

            {/* <Text className="mt-0.5 text-[13px] font-medium text-gray-400">
              {filteredDonors.length}{" "}
              {filteredDonors.length === 1 ? "donor" : "donors"} ready to help
            </Text> */}
          </View>

          {/* Search & Filter Section */}
          <View className="border-b border-gray-100 bg-[#F5F7FA] px-5 pb-4">
            {/* Search Bar */}
            <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-0.5 shadow-sm">
              <Ionicons name="search-outline" size={19} color="#9CA3AF" />

              <TextInput
                className="ml-3 flex-1 py-3 text-[14px] font-medium text-gray-800"
                placeholder="Search by name, phone, blood, location..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearch}
              />

              {searchQuery !== "" && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSearch("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Blood Type Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 8 }}
            >
              {BLOOD_TYPE_FILTERS.map((type) => {
                const active = selectedBloodType === type;

                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    onPress={() => handleBloodTypeFilter(type)}
                    className={`rounded-full border px-4 py-2 ${
                      active
                        ? "border-red-600 bg-red-600"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-[12px] font-extrabold ${
                        active ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View className="pt-4">
            {/* Donor List */}
            {filteredDonors.length > 0 ? (
              filteredDonors.map((donor) => (
                <Donorcard
                  key={donor.id}
                  fullName={donor.fullName}
                  bloodType={donor.bloodType}
                  location={donor.location || "Swat, Pakistan"}
                  donationsCount={donor.donationsCount || 0}
                  isAvailable={donor.availableToDonate !== false}
                  avatarUrl={donor.avatarUrl}
                  gender={donor.gender}
                  onPress={() =>
                    router.push(`/donor/${donor.id}` as any)
                  }
                  onCallPress={() =>
                    handleCall(donor.phoneNumber, donor.fullName)
                  }
                />
              ))
            ) : (
              <View className="items-center justify-center py-20">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="people-outline"
                    size={38}
                    color="#CBD5E1"
                  />
                </View>

                <Text className="mt-4 text-[16px] font-extrabold text-gray-700">
                  No donors found
                </Text>

                <Text className="mt-1 text-[13px] font-medium text-gray-400">
                  Try searching with different criteria
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default Donors;
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

  // =====================================================
  // CALL DONOR
  // =====================================================

  const handleCall = (phoneNumber: string, name: string) => {
    if (!phoneNumber) {
      Alert.alert(
        "Error",
        "Phone number not available for this donor."
      );
      return;
    }

    const sanitizedNumber = phoneNumber.replace(/[^\d+]/g, "");
    const url = `tel:${sanitizedNumber}`;

    Linking.openURL(url).catch((err) => {
      console.error("An error occurred", err);

      Alert.alert(
        "Error",
        "Phone calls are not supported on this device or the dialer could not be opened."
      );
    });
  };

  // =====================================================
  // LOAD DONORS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      fetchDonors();
    }, [])
  );

  const fetchDonors = async () => {
    try {
      setLoading(true);

      const querySnapshot = await getDocs(
        collection(db, "users")
      );

      const donorsList: any[] = [];

      querySnapshot.forEach((doc: any) => {
        const donor = doc.data();
        const role = String(
          donor.role || ""
        ).toLowerCase();

        if (
          role !== "admin" &&
          role !== "bloodbankadmin"
        ) {
          donorsList.push({
            id: doc.id,
            ...donor,
          });
        }
      });

      setDonors(donorsList);
      setFilteredDonors(donorsList);
    } catch (error) {
      console.error(
        "Error fetching donors:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILTERS
  // =====================================================

  const applyFilters = (
    query: string,
    bloodType: string
  ) => {
    let filtered = donors;

    if (bloodType !== "All") {
      filtered = filtered.filter(
        (donor) =>
          donor.bloodType === bloodType
      );
    }

    if (query.trim() !== "") {
      const q = query.toLowerCase();

      filtered = filtered.filter(
        (donor) =>
          donor.fullName
            ?.toLowerCase()
            .includes(q) ||
          donor.phoneNumber?.includes(q) ||
          donor.bloodType
            ?.toLowerCase()
            .includes(q) ||
          donor.location
            ?.toLowerCase()
            .includes(q)
      );
    }

    setFilteredDonors(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    applyFilters(
      query,
      selectedBloodType
    );
  };

  const handleBloodTypeFilter = (
    bloodType: string
  ) => {
    setSelectedBloodType(bloodType);

    applyFilters(
      searchQuery,
      bloodType
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FB]"
      edges={["top"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8F9FB"
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color="#E11D2E"
          />

          <Text className="mt-4 text-sm font-semibold text-gray-400">
            Fetching Donors...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: 120,
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

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

          {/* =================================================
              SEARCH
          ================================================= */}

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

          {/* =================================================
              BLOOD GROUP FILTERS
          ================================================= */}

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

          {/* =================================================
              RESULTS HEADER
          ================================================= */}

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

          {/* =================================================
              DONOR LIST
          ================================================= */}

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
                  No donors found
                </Text>

                <Text className="mt-1 text-center text-[13px] font-medium text-gray-400">
                  Try searching with
                  different criteria
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
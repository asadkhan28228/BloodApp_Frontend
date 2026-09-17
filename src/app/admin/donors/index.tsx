import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs } from "@/src/lib/backendCompat";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "../../../config/backendConfig";

interface Donor {
  id: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  bloodType?: string;
  location?: string;
  availableToDonate?: boolean;
  isActive?: boolean;
  lastDonationDate?: any;
  role?: string;
}

const bloodGroups = [
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

const ManageDonors = () => {
  const router = useRouter();

  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBloodGroup, setSelectedBloodGroup] =
    useState("All");

  const fetchDonors = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "users")
      );

      const donorList: Donor[] = [];

      snapshot.forEach((userDoc : any) => {
        const data = userDoc.data();

        // Admin exclude
        if (
          data.role !== "admin" &&
          data.role !== "bloodBankAdmin" &&
          data.bloodType
        ) {
          donorList.push({
            id: userDoc.id,
            ...data,
          });
        }
      });

      setDonors(donorList);
    } catch (error) {
      console.error(
        "Error fetching donors:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const filteredDonors = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return donors.filter((donor) => {
      const matchesSearch =
        !keyword ||
        donor.fullName
          ?.toLowerCase()
          .includes(keyword) ||
        donor.email
          ?.toLowerCase()
          .includes(keyword) ||
        donor.location
          ?.toLowerCase()
          .includes(keyword);

      const matchesBloodGroup =
        selectedBloodGroup === "All" ||
        donor.bloodType === selectedBloodGroup;

      return matchesSearch && matchesBloodGroup;
    });
  }, [donors, search, selectedBloodGroup]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />

        <Text className="mt-4 font-semibold text-gray-400">
          Loading Donors...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top"]}
    >
      {/* Header */}

      <View className="flex-row items-center border-b border-gray-100 px-5 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#111827"
          />
        </TouchableOpacity>

        <View className="ml-4">
          <Text className="text-2xl font-black text-gray-900">
            Manage Donors
          </Text>

          <Text className="text-xs font-semibold text-gray-400">
            View registered blood donors
          </Text>
        </View>
      </View>

      {/* Search */}

      <View className="px-5 pt-5">
        <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4">
          <Ionicons
            name="search-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search donor..."
            placeholderTextColor="#9CA3AF"
            className="ml-3 flex-1 py-4 font-semibold text-gray-900"
          />
        </View>
      </View>

      {/* Blood Group Filter */}

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
          }}
        >
          {bloodGroups.map((group) => {
            const selected =
              selectedBloodGroup === group;

            return (
              <TouchableOpacity
                key={group}
                onPress={() =>
                  setSelectedBloodGroup(group)
                }
                className={`mr-2 rounded-full border px-4 py-2 ${
                  selected
                    ? "border-red-600 bg-red-600"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Text
                  className={`text-xs font-black ${
                    selected
                      ? "text-white"
                      : "text-gray-500"
                  }`}
                >
                  {group}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Count */}

      <View className="px-5 py-4">
        <Text className="text-sm font-bold text-gray-400">
          {filteredDonors.length} Donor
          {filteredDonors.length !== 1
            ? "s"
            : ""}
        </Text>
      </View>

      {/* Donors */}

      <FlatList
        data={filteredDonors}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Ionicons
              name="heart-outline"
              size={55}
              color="#D1D5DB"
            />

            <Text className="mt-4 font-bold text-gray-400">
              No donors found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isAvailable =
            item.availableToDonate !== false &&
            item.isActive !== false;

          return (
            <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <View className="flex-row items-center">
                {/* Blood Group Circle */}

                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                  <Text className="text-xl font-black text-red-600">
                    {item.bloodType || "?"}
                  </Text>
                </View>

                {/* Donor Info */}

                <View className="ml-4 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-base font-black text-gray-900"
                  >
                    {item.fullName ||
                      "Unknown Donor"}
                  </Text>

                  <Text
                    numberOfLines={1}
                    className="mt-1 text-xs font-semibold text-gray-400"
                  >
                    {item.email || "No email"}
                  </Text>

                  {item.location && (
                    <View className="mt-2 flex-row items-center">
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color="#9CA3AF"
                      />

                      <Text className="ml-1 text-[10px] font-bold text-gray-400">
                        {item.location}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Details */}

              <View className="mt-5 flex-row justify-between border-t border-gray-100 pt-4">
                <View>
                  <Text className="text-[10px] font-black uppercase text-gray-400">
                    Phone
                  </Text>

                  <Text className="mt-1 text-xs font-bold text-gray-700">
                    {item.phoneNumber ||
                      "Not available"}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-[10px] font-black uppercase text-gray-400">
                    Status
                  </Text>

                  <View
                    className={`mt-1 rounded-full px-3 py-1 ${
                      isAvailable
                        ? "bg-green-50"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black ${
                        isAvailable
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {isAvailable
                        ? "Available"
                        : "Unavailable"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default ManageDonors;
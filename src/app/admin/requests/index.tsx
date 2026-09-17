import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "@/src/lib/backendCompat";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "../../../config/backendConfig";

interface BloodRequest {
  id: string;
  patientName?: string;
  bloodType?: string;
  urgency?: string;
  hospitalName?: string;
  location?: string;
  contactPhone?: string;
  unitsNeeded?: number;
  additionalNotes?: string;
  status?: string;
}

const filters = [
  "All",
  "Pending",
  "Urgent",
  "Critical",
  "Completed",
];

const ManageRequests = () => {
  const router = useRouter();

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "blood-requests")
      );

      const requestList: BloodRequest[] = [];

      snapshot.forEach((requestDoc : any) => {
        const data = requestDoc.data();

        requestList.push({
          id: requestDoc.id,
          ...data,
        });
      });

      setRequests(requestList);
    } catch (error) {
      console.error("Error fetching blood requests:", error);

      Alert.alert(
        "Error",
        "Could not load blood requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return requests.filter((request) => {
      const requestStatus =
        request.status || "Pending";

      const matchesSearch =
        !keyword ||
        request.patientName
          ?.toLowerCase()
          .includes(keyword) ||
        request.hospitalName
          ?.toLowerCase()
          .includes(keyword) ||
        request.bloodType
          ?.toLowerCase()
          .includes(keyword) ||
        request.location
          ?.toLowerCase()
          .includes(keyword);

      let matchesFilter = true;

      if (selectedFilter === "Pending") {
        matchesFilter = requestStatus === "Pending";
      }

      if (selectedFilter === "Completed") {
        matchesFilter = requestStatus === "Completed";
      }

      if (
        selectedFilter === "Urgent" ||
        selectedFilter === "Critical"
      ) {
        matchesFilter =
          request.urgency === selectedFilter;
      }

      return matchesSearch && matchesFilter;
    });
  }, [requests, search, selectedFilter]);

  const updateRequestStatus = async (
    request: BloodRequest,
    newStatus: string
  ) => {
    try {
      await updateDoc(
        doc(db, "blood-requests", request.id),
        {
          status: newStatus,
        }
      );

      setRequests((currentRequests) =>
        currentRequests.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );

      Alert.alert(
        "Success",
        `Request marked as ${newStatus}.`
      );
    } catch (error) {
      console.error(
        "Error updating request status:",
        error
      );

      Alert.alert(
        "Error",
        "Could not update request status."
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />

        <Text className="mt-4 font-semibold text-gray-400">
          Loading Blood Requests...
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
            Blood Requests
          </Text>

          <Text className="text-xs font-semibold text-gray-400">
            Manage all blood requests
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
            placeholder="Search request..."
            placeholderTextColor="#9CA3AF"
            className="ml-3 flex-1 py-4 font-semibold text-gray-900"
          />
        </View>
      </View>

      {/* Filters */}

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
          }}
        >
          {filters.map((filter) => {
            const selected =
              selectedFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                onPress={() =>
                  setSelectedFilter(filter)
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
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Count */}

      <View className="px-5 py-4">
        <Text className="text-sm font-bold text-gray-400">
          {filteredRequests.length} Request
          {filteredRequests.length !== 1
            ? "s"
            : ""}
        </Text>
      </View>

      {/* Request List */}

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Ionicons
              name="water-outline"
              size={55}
              color="#D1D5DB"
            />

            <Text className="mt-4 font-bold text-gray-400">
              No blood requests found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status =
            item.status || "Pending";

          const isCritical =
            item.urgency === "Critical";

          const isUrgent =
            item.urgency === "Urgent";

          return (
            <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              {/* Top */}

              <View className="flex-row items-center">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                  <Text className="text-xl font-black text-red-600">
                    {item.bloodType || "?"}
                  </Text>
                </View>

                <View className="ml-4 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-base font-black text-gray-900"
                  >
                    {item.patientName ||
                      "Unknown Patient"}
                  </Text>

                  <Text
                    numberOfLines={1}
                    className="mt-1 text-xs font-semibold text-gray-400"
                  >
                    {item.hospitalName ||
                      "Hospital not specified"}
                  </Text>

                  <View className="mt-2 flex-row items-center">
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color="#9CA3AF"
                    />

                    <Text
                      numberOfLines={1}
                      className="ml-1 flex-1 text-[10px] font-bold text-gray-400"
                    >
                      {item.location ||
                        "Location unavailable"}
                    </Text>
                  </View>
                </View>

                <View
                  className={`rounded-full px-3 py-2 ${
                    isCritical
                      ? "bg-red-100"
                      : isUrgent
                      ? "bg-orange-100"
                      : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-[9px] font-black uppercase ${
                      isCritical
                        ? "text-red-600"
                        : isUrgent
                        ? "text-orange-600"
                        : "text-gray-500"
                    }`}
                  >
                    {item.urgency || "Normal"}
                  </Text>
                </View>
              </View>

              {/* Request Details */}

              <View className="mt-5 flex-row justify-between border-t border-gray-100 pt-4">
                <View>
                  <Text className="text-[10px] font-black uppercase text-gray-400">
                    Units
                  </Text>

                  <Text className="mt-1 text-sm font-black text-gray-800">
                    {item.unitsNeeded || 1}
                  </Text>
                </View>

                <View>
                  <Text className="text-[10px] font-black uppercase text-gray-400">
                    Contact
                  </Text>

                  <Text className="mt-1 text-xs font-bold text-gray-700">
                    {item.contactPhone ||
                      "N/A"}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-[10px] font-black uppercase text-gray-400">
                    Status
                  </Text>

                  <Text
                    className={`mt-1 text-xs font-black ${
                      status === "Completed"
                        ? "text-green-600"
                        : status === "Cancelled"
                        ? "text-gray-500"
                        : "text-red-600"
                    }`}
                  >
                    {status}
                  </Text>
                </View>
              </View>

              {/* Notes */}

              {item.additionalNotes ? (
                <View className="mt-4 rounded-2xl bg-gray-50 p-3">
                  <Text className="text-[10px] font-black uppercase text-gray-400">
                    Notes
                  </Text>

                  <Text className="mt-1 text-xs font-medium leading-5 text-gray-600">
                    {item.additionalNotes}
                  </Text>
                </View>
              ) : null}

              {/* Actions */}

              {status !== "Completed" &&
                status !== "Cancelled" && (
                  <View className="mt-4 flex-row gap-3">
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Complete Request",
                          "Mark this blood request as completed?",
                          [
                            {
                              text: "Cancel",
                              style: "cancel",
                            },
                            {
                              text: "Complete",
                              onPress: () =>
                                updateRequestStatus(
                                  item,
                                  "Completed"
                                ),
                            },
                          ]
                        )
                      }
                      className="flex-1 items-center rounded-2xl bg-green-50 py-3"
                    >
                      <Text className="text-xs font-black text-green-600">
                        Complete
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Cancel Request",
                          "Are you sure you want to cancel this request?",
                          [
                            {
                              text: "No",
                              style: "cancel",
                            },
                            {
                              text: "Yes",
                              style: "destructive",
                              onPress: () =>
                                updateRequestStatus(
                                  item,
                                  "Cancelled"
                                ),
                            },
                          ]
                        )
                      }
                      className="flex-1 items-center rounded-2xl bg-red-50 py-3"
                    >
                      <Text className="text-xs font-black text-red-600">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default ManageRequests;
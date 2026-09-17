import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "@/src/lib/backendCompat";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "../../../config/backendConfig";

interface EmergencyItem {
  id: string;

  type?: string;
  title?: string;
  message?: string;

  patientName?: string;
  bloodType?: string;
  urgency?: string;

  hospitalName?: string;
  location?: string;
  contactPhone?: string;

  reporterName?: string;
  reporterUid?: string;

  status?: string;
  priority?: string;
  bloodSource?: string;
  emergencyId?: string;
}

const EmergencyManagement = () => {
  const router = useRouter();

  const [emergencies, setEmergencies] = useState<EmergencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ==========================================
  // GET EMERGENCY DATA
  // ==========================================

  const fetchEmergencies = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "community_notifications")
      );

      const emergencyList: EmergencyItem[] = [];

      snapshot.forEach((emergencyDoc :any) => {
        const data = emergencyDoc.data();

        // Sirf emergency notifications
        if (data.type === "emergency") {
          emergencyList.push({
            id: emergencyDoc.id,
            ...data,
          });
        }
      });

      setEmergencies(emergencyList);
    } catch (error) {
      console.error(
        "Error fetching emergencies:",
        error
      );

      Alert.alert(
        "Error",
        "Could not load emergency reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, []);

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredEmergencies = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return emergencies;
    }

    return emergencies.filter((item) => {
      return (
        item.patientName
          ?.toLowerCase()
          .includes(keyword) ||
        item.bloodType
          ?.toLowerCase()
          .includes(keyword) ||
        item.location
          ?.toLowerCase()
          .includes(keyword) ||
        item.hospitalName
          ?.toLowerCase()
          .includes(keyword) ||
        item.title
          ?.toLowerCase()
          .includes(keyword)
      );
    });
  }, [emergencies, search]);

  // ==========================================
  // RESOLVE EMERGENCY
  // ==========================================

  const resolveEmergency = async (
    emergency: EmergencyItem
  ) => {
    try {
      // Admin resolving an emergency also deletes it
      // immediately, same as the reporter's own
      // "Mark Emergency Resolved" action in the app.
      await deleteDoc(
        doc(
          db,
          "community_notifications",
          emergency.id
        )
      );

      if (emergency.emergencyId) {
        const linkedRequests = await getDocs(
          query(
            collection(db, "blood-requests"),
            where(
              "emergencyId",
              "==",
              emergency.emergencyId
            )
          )
        );

        await Promise.all(
          linkedRequests.docs.map((requestDoc) =>
            deleteDoc(
              doc(
                db,
                "blood-requests",
                requestDoc.id
              )
            )
          )
        );
      }

      setEmergencies((current) =>
        current.filter(
          (item) => item.id !== emergency.id
        )
      );

      Alert.alert(
        "Success",
        "Emergency marked as resolved and removed."
      );
    } catch (error) {
      console.error(
        "Error resolving emergency:",
        error
      );

      Alert.alert(
        "Error",
        "Could not resolve emergency."
      );
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />

        <Text className="mt-4 font-semibold text-gray-400">
          Loading Emergencies...
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================
  // UI
  // ==========================================

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
            Emergencies
          </Text>

          <Text className="text-xs font-semibold text-gray-400">
            Monitor and resolve emergency alerts
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
            placeholder="Search emergency..."
            placeholderTextColor="#9CA3AF"
            className="ml-3 flex-1 py-4 font-semibold text-gray-900"
          />
        </View>
      </View>

      {/* Count */}

      <View className="px-5 py-4">
        <Text className="text-sm font-bold text-gray-400">
          {filteredEmergencies.length} Emergency Report
          {filteredEmergencies.length !== 1
            ? "s"
            : ""}
        </Text>
      </View>

      {/* Emergency List */}

      <FlatList
        data={filteredEmergencies}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Ionicons
              name="warning-outline"
              size={60}
              color="#D1D5DB"
            />

            <Text className="mt-4 font-bold text-gray-400">
              No emergency reports found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status =
            item.status || "Active";

          const resolved =
            status === "Resolved";

          return (
            <View
              className={`mb-4 rounded-3xl border p-5 shadow-sm ${
                resolved
                  ? "border-gray-100 bg-gray-50"
                  : "border-red-100 bg-white"
              }`}
            >
              {/* Emergency Header */}

              <View className="flex-row items-center">
                <View
                  className={`h-14 w-14 items-center justify-center rounded-2xl ${
                    resolved
                      ? "bg-gray-200"
                      : "bg-red-600"
                  }`}
                >
                  <Ionicons
                    name={
                      resolved
                        ? "checkmark-circle-outline"
                        : "warning-outline"
                    }
                    size={28}
                    color={
                      resolved
                        ? "#6B7280"
                        : "white"
                    }
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-base font-black text-gray-900">
                    {item.patientName ||
                      item.title ||
                      "Emergency Alert"}
                  </Text>

                  <Text className="mt-1 text-xs font-semibold text-red-600">
                    {item.bloodType
                      ? `Blood Type: ${item.bloodType}`
                      : "Emergency Blood Request"}
                  </Text>
                </View>

                <View
                  className={`rounded-full px-3 py-2 ${
                    resolved
                      ? "bg-gray-200"
                      : "bg-red-50"
                  }`}
                >
                  <Text
                    className={`text-[9px] font-black uppercase ${
                      resolved
                        ? "text-gray-600"
                        : "text-red-600"
                    }`}
                  >
                    {status}
                  </Text>
                </View>
              </View>

              {/* Priority / Blood Source */}

              {(item.priority || item.bloodSource) && (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {item.priority && (
                    <View className="rounded-full bg-red-50 px-3 py-1.5">
                      <Text className="text-[10px] font-black uppercase tracking-wider text-red-600">
                        Priority: {item.priority}
                      </Text>
                    </View>
                  )}

                  {item.bloodSource && (
                    <View
                      className={`rounded-full px-3 py-1.5 ${
                        item.bloodSource === "Blood Bank Reserve"
                          ? "bg-blue-50"
                          : "bg-orange-50"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          item.bloodSource === "Blood Bank Reserve"
                            ? "text-blue-700"
                            : "text-orange-700"
                        }`}
                      >
                        {item.bloodSource === "Blood Bank Reserve"
                          ? "Reserved From Blood Bank"
                          : "Sourced From Donors"}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Details */}

              <View className="mt-5 border-t border-gray-100 pt-4">
                {item.hospitalName && (
                  <View className="mb-3 flex-row items-center">
                    <Ionicons
                      name="medical-outline"
                      size={17}
                      color="#6B7280"
                    />

                    <Text className="ml-3 flex-1 text-sm font-semibold text-gray-600">
                      {item.hospitalName}
                    </Text>
                  </View>
                )}

                {item.location && (
                  <View className="mb-3 flex-row items-center">
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color="#6B7280"
                    />

                    <Text className="ml-3 flex-1 text-sm font-semibold text-gray-600">
                      {item.location}
                    </Text>
                  </View>
                )}

                {item.contactPhone && (
                  <View className="mb-3 flex-row items-center">
                    <Ionicons
                      name="call-outline"
                      size={17}
                      color="#6B7280"
                    />

                    <Text className="ml-3 flex-1 text-sm font-semibold text-gray-600">
                      {item.contactPhone}
                    </Text>
                  </View>
                )}

                {item.message && (
                  <View className="mt-2 rounded-2xl bg-red-50 p-4">
                    <Text className="text-[10px] font-black uppercase text-red-400">
                      Emergency Message
                    </Text>

                    <Text className="mt-2 text-xs font-medium leading-5 text-gray-600">
                      {item.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Resolve */}

              {!resolved && (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      "Resolve Emergency",
                      "Are you sure this emergency has been resolved?",
                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: "Resolve",
                          onPress: () =>
                            resolveEmergency(item),
                        },
                      ]
                    );
                  }}
                  className="mt-5 items-center rounded-2xl bg-green-50 py-4"
                >
                  <Text className="text-xs font-black uppercase tracking-wider text-green-600">
                    Mark as Resolved
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default EmergencyManagement;
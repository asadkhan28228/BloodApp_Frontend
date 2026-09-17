import BloodRequestCard from "@/src/components/bloodRequestCard";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, orderBy, query } from "@/src/lib/backendCompat";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../../config/backendConfig";

const Requests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // ======================================================
  // DETAIL CARD MODAL
  // Shows full info for the request that was tapped.
  // ======================================================

  const [selectedRequest, setSelectedRequest] =
    useState<any | null>(null);

  const [detailVisible, setDetailVisible] =
    useState(false);

  const openRequestDetail = (req: any) => {
    setSelectedRequest(req);
    setDetailVisible(true);
  };

  const closeRequestDetail = () => {
    setDetailVisible(false);
    setSelectedRequest(null);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Remove expired blood requests from the screen automatically
  // without requiring a manual refresh. Backend still permanently
  // deletes the same request from the database.
  useEffect(() => {
    const removeExpiredRequests = () => {
      const now = Date.now();

      const isNotExpired = (request: any) => {
        if (!request?.expireAt) return true;

        const expireDate = request.expireAt?.toDate
          ? request.expireAt.toDate()
          : new Date(request.expireAt);

        if (Number.isNaN(expireDate.getTime())) return true;

        return expireDate.getTime() > now;
      };

      setRequests((current) => current.filter(isNotExpired));
      setFilteredRequests((current) => current.filter(isNotExpired));

      // If the currently opened request expires, close its detail modal too.
      setSelectedRequest((current: any) => {
        if (!current || isNotExpired(current)) return current;
        setDetailVisible(false);
        return null;
      });
    };

    removeExpiredRequests();

    // Check every 10 seconds so the card disappears automatically.
    const expiryInterval = setInterval(removeExpiredRequests, 10000);

    return () => clearInterval(expiryInterval);
  }, []);

  const fetchRequests = async () => {
    try {
      const currentUid = auth.currentUser?.uid;

      const q = query(
        collection(db, "blood-requests"),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);
      const requestList: any[] = [];
      querySnapshot.forEach((doc : any) => {
        const data = doc.data();

        // Don't show a user their own posted blood request
        // in this browse list — only requests posted by
        // other people should appear here. (Emergency flow
        // is untouched by this filter.)
        if (
          currentUid &&
          data.reporterUid &&
          data.reporterUid === currentUid
        ) {
          return;
        }

        requestList.push({ id: doc.id, ...data });
      });
      setRequests(requestList);
      setFilteredRequests(requestList);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredRequests(requests);
      return;
    }

    const filtered = requests.filter((req) => {
      const q = text.toLowerCase();
      return (
        req.patientName?.toLowerCase().includes(q) ||
        req.bloodType?.toLowerCase().includes(q) ||
        req.hospitalName?.toLowerCase().includes(q) ||
        req.location?.toLowerCase().includes(q)
      );
    });
    setFilteredRequests(filtered);
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Contact number not available.");
      return;
    }

    // Sanitize phone number (remove spaces, dashes, etc.)
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

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Just now";

    const date =
      timestamp?.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    const seconds = Math.max(
      0,
      Math.floor((Date.now() - date.getTime()) / 1000)
    );

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.floor(hours / 24);

    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <StatusBar
        barStyle={"light-content"}
        backgroundColor={"transparent"}
        translucent
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#DC2626" />
          <Text className="mt-4 text-gray-400 font-medium">
            Loading Requests...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          className="flex-1"
        >
          {/* Search Bar */}
          <View className="px-4 py-4 border-b border-gray-50">
            <View className="flex-row items-center rounded-2xl bg-gray-50 px-4 border border-gray-100 shadow-sm">
              <Ionicons name="search-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base font-semibold text-gray-900"
                placeholder="Search by name, phone, blood, location..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery !== "" && (
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="#9CA3AF"
                  onPress={() => handleSearch("")}
                />
              )}
            </View>
          </View>

          {filteredRequests.length > 0 ? (
            filteredRequests.map((req) => (
              <View key={req.id} className="mx-4">
                <BloodRequestCard
                  patientName={req.patientName}
                  bloodType={req.bloodType}
                  location={`${req.hospitalName || ""}${
                    req.location
                      ? `, ${req.location.split("|")[0]}`
                      : ""
                  }`}
                  timeAgo={getTimeAgo(req.createdAt)}
                  units={req.unitsNeeded}
                  isUrgent={
                    req.urgency === "Urgent" || req.urgency === "Critical"
                  }
                  avatarUrl={req.avatarUrl}
                  gender={req.gender}
                  reporterName={req.reporterName}
                  onCallPress={() => handleCall(req.contactPhone)}
                  onPress={() => openRequestDetail(req)}
                />
              </View>
            ))
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="flask-outline" size={80} color="#F3F4F6" />
              <Text className="mt-4 text-lg font-bold text-gray-400">
                No requests found
              </Text>
              <Text className="text-gray-300 text-sm">
                Try searching with different criteria
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ==================================================
          REQUEST DETAIL CARD MODAL
      ================================================== */}

      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={closeRequestDetail}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
            {/* Drag handle */}
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-gray-200" />

            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-black text-gray-900">
                    Request Details
                  </Text>

                  <TouchableOpacity
                    onPress={closeRequestDetail}
                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color="#111827"
                    />
                  </TouchableOpacity>
                </View>

                {/* Patient + Blood Type */}
                <View className="mt-5 flex-row items-center">
                  <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-600">
                    <Text className="text-lg font-black text-white">
                      {selectedRequest.bloodType}
                    </Text>
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="text-lg font-black text-gray-900">
                      {selectedRequest.patientName}
                    </Text>

                    <View className="mt-1.5 flex-row items-center">
                      <View
                        className={`rounded-full px-2.5 py-1 ${
                          selectedRequest.urgency ===
                            "Urgent" ||
                          selectedRequest.urgency ===
                            "Critical"
                            ? "bg-red-50"
                            : "bg-blue-50"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase tracking-wider ${
                            selectedRequest.urgency ===
                              "Urgent" ||
                            selectedRequest.urgency ===
                              "Critical"
                              ? "text-red-600"
                              : "text-blue-500"
                          }`}
                        >
                          {selectedRequest.urgency ||
                            "Normal"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Detail rows */}
                <View className="mt-6 gap-4">
                  <DetailRow
                    icon="location-outline"
                    label="Location"
                    value={`${selectedRequest.hospitalName || ""}${
                      selectedRequest.location
                        ? `, ${selectedRequest.location.split("|")[0]}`
                        : ""
                    }`}
                  />

                  <DetailRow
                    icon="water-outline"
                    label="Units Needed"
                    value={
                      selectedRequest.unitsNeeded
                        ? `${selectedRequest.unitsNeeded} unit${
                            Number(
                              selectedRequest.unitsNeeded,
                            ) > 1
                              ? "s"
                              : ""
                          }`
                        : "1 unit"
                    }
                  />

                  <DetailRow
                    icon="call-outline"
                    label="Contact Phone"
                    value={
                      selectedRequest.contactPhone ||
                      "Not provided"
                    }
                  />

                  <DetailRow
                    icon="time-outline"
                    label="Posted"
                    value={getTimeAgo(
                      selectedRequest.createdAt,
                    )}
                  />

                  {selectedRequest.additionalNotes ? (
                    <DetailRow
                      icon="document-text-outline"
                      label="Additional Notes"
                      value={
                        selectedRequest.additionalNotes
                      }
                    />
                  ) : null}
                </View>

                {/* Call button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    handleCall(
                      selectedRequest.contactPhone,
                    )
                  }
                  className="mt-7 flex-row items-center justify-center rounded-2xl bg-red-600 py-4"
                >
                  <Ionicons
                    name="call"
                    size={18}
                    color="white"
                  />

                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                    Call to Help
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ======================================================
// DETAIL ROW
// ======================================================

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View className="flex-row items-start">
    <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
      <Ionicons
        name={icon}
        size={16}
        color="#6B7280"
      />
    </View>

    <View className="ml-3 flex-1">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </Text>

      <Text className="mt-0.5 text-sm font-semibold text-gray-800">
        {value}
      </Text>
    </View>
  </View>
);

export default Requests;
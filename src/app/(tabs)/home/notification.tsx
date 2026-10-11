import { apiRequest } from "@/src/lib/api";
import { startNotificationConnection, stopNotificationConnection } from "@/src/services/signalRService";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStore } from "../../../store/userStore";
interface NotificationItem {
  id: string;
  type:
    | "request"
    | "donation"
    | "system"
    | "community"
    | "registration"
    | "emergency"
    | "emergency_response"
    | "blood_request_response"
    | "blood_request_confirmed"
    | "blood_request_rejected"
    | "donation_completed";
  title: string;
  message: string;
  createdAt: any;
  unread: boolean;
  icon: string;
  color: string;
  isCommunity: boolean;
  location?: string;
  phoneNumber?: string;
  bloodType?: string;
  details?: string;
  category?: string;
  bloodSource?: string;
  reporterName?: string;
  reporterUid?: string;
  donorResponses?: Array<{
    uid?: string;
    name?: string;
    phone?: string;
    donorUid?: string;
    donorName?: string;
    phoneNumber?: string;
    status?: string;
    response?: string;
  }>;
  responseStatus?: string;
  donorName?: string;
  donorUid?: string;
  userId?: string;
  emergencyId?: string;
  emergencyRequestId?: string;
  referenceId?: string;
  bloodRequestId?: string;
}
interface BloodRequestResponder {
  id: string;
  bloodRequestId: string;
  donorId: string;
  donorName: string;
  donorPhone?: string;
  bloodType?: string;
  status: string;
  createdAt: any;
  updatedAt?: any;
}
/* =========================================================
   NOTIFICATION CARD
\========================================================= */
const NotificationCard = ({
  item,
  onPress,
  onLongPress,
  selected,
}: {
  item: NotificationItem;
  onPress: () => void;
  onLongPress: () => void;
  selected: boolean;
}) => {
  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Just now";
    let date: Date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else {
      let value = String(timestamp);
      // ASP.NET DateTime values are stored as UTC.
      // If the API sends a UTC timestamp without "Z" or an offset,
      // append "Z" so React Native parses it correctly as UTC.
      if (
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
        !value.endsWith("Z") &&
        !/[+-]\d{2}:\d{2}$/.test(value)
      ) {
        value += "Z";
      }
      date = new Date(value);
    }
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
    if (days < 30) {
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months === 1 ? "" : "s"} ago`;
    }
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? "" : "s"} ago`;
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      activeOpacity={0.85}
      className={`mb-4 flex-row items-start rounded-[22px] border p-4 ${
        selected
          ? "border-red-500 bg-red-50"
          : item.unread
            ? "border-red-100 bg-red-50"
            : "border-gray-100 bg-white"
      }`}
    >
      {selected && (
        <View className="absolute right-3 top-3 z-10 h-6 w-6 items-center justify-center rounded-full bg-red-600">
          <Ionicons name="checkmark" size={15} color="white" />
        </View>
      )}
      {/* Notification Icon */}
      <View
        style={{
          backgroundColor: item.color || "#DC2626",
        }}
        className="h-14 w-14 items-center justify-center rounded-[18px]"
      >
        <Ionicons
          name={(item.icon as any) || "notifications-outline"}
          size={25}
          color="white"
        />
      </View>
      {/* Content */}
      <View className="ml-4 flex-1">
        <View className="flex-row items-start">
          <Text
            className="flex-1 text-[16px] font-extrabold leading-5 text-gray-900"
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.unread && (
            <View className="ml-3 mt-1 h-2.5 w-2.5 rounded-full bg-red-600" />
          )}
        </View>
        <Text
          className="mt-1.5 text-[14px] font-medium leading-5 text-gray-500"
          numberOfLines={3}
        >
          {item.message}
        </Text>
        <Text className="mt-2 text-[11px] font-semibold text-gray-400">
          {getTimeAgo(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
/* =========================================================
   MAIN NOTIFICATION SCREEN
\========================================================= */
const Notification = () => {
  const { user: currentUserData } = useUserStore();
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Detail Modal
  const [selectedNotif, setSelectedNotif] =
    useState<NotificationItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [bloodResponders, setBloodResponders] = useState<BloodRequestResponder[]>([]);
  const [respondersLoading, setRespondersLoading] = useState(false);
  const [responderModalVisible, setResponderModalVisible] = useState(false);
  const [selectedBloodRequestId, setSelectedBloodRequestId] = useState<string | null>(null);
  const [selectedNotificationKeys, setSelectedNotificationKeys] =
    useState<string[]>([]);
  const getNotificationKey = (item: NotificationItem) =>
    `${item.isCommunity ? "community" : "private"}:${item.id}`;
  const isSelectionMode = selectedNotificationKeys.length > 0;
  const toggleNotificationSelection = (item: NotificationItem) => {
    const key = getNotificationKey(item);
    setSelectedNotificationKeys((previous) =>
      previous.includes(key)
        ? previous.filter((selectedKey) => selectedKey !== key)
        : [...previous, key]
    );
  };
  const clearNotificationSelection = () => {
    setSelectedNotificationKeys([]);
  };
  const toggleSelectAllNotifications = () => {
    const allKeys = notifications.map(getNotificationKey);
    const allSelected =
      allKeys.length > 0 &&
      allKeys.every((key) =>
        selectedNotificationKeys.includes(key)
      );
    setSelectedNotificationKeys(allSelected ? [] : allKeys);
  };
  /* =========================================================
     REST + SIGNALR NOTIFICATIONS
  ========================================================= */
  const normalizeNotification = (
    raw: any,
    isCommunity: boolean
  ): NotificationItem => {
    const rawType = raw.type ?? raw.Type ?? "";
    const type = String(rawType).trim().toLowerCase();
    const referenceId =
      raw.referenceId ??
      raw.ReferenceId ??
      raw.bloodRequestId ??
      raw.BloodRequestId;
    const isEmergencyNotification =
      type === "emergency" ||
      type === "emergency_response";
    return {
      ...raw,
      id: String(raw.id ?? raw.Id),
      type: type as NotificationItem["type"],
      title: raw.title ?? raw.Title ?? "Notification",
      message: raw.message ?? raw.Message ?? "",
      createdAt: raw.createdAt ?? raw.CreatedAt,
      isCommunity,
      reporterUid: raw.reporterUid ?? raw.ReporterUid,
      reporterName: raw.reporterName ?? raw.ReporterName,
      bloodType: raw.bloodType ?? raw.BloodType,
      location: raw.location ?? raw.Location,
      phoneNumber: raw.phoneNumber ?? raw.PhoneNumber,
      unread: raw.unread ?? raw.Unread ?? true,
      icon: raw.icon ?? raw.Icon ?? "notifications-outline",
      color: raw.color ?? raw.Color ?? "#DC2626",
      referenceId: referenceId ? String(referenceId) : undefined,
      bloodRequestId:
        raw.bloodRequestId ??
        raw.BloodRequestId ??
        (!isEmergencyNotification && referenceId
          ? String(referenceId)
          : undefined),
      emergencyId:
        raw.emergencyId ??
        raw.EmergencyId ??
        raw.emergencyRequestId ??
        raw.EmergencyRequestId ??
        (isEmergencyNotification && referenceId
          ? String(referenceId)
          : undefined),
      responseStatus:
        raw.responseStatus ??
        raw.ResponseStatus ??
        raw.status ??
        raw.Status,
    };
  };
  // Backend stores UTC dates; parse values without timezone as UTC.
  const notificationTime = (value: any): number => {
    if (!value) return Date.now();
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    let dateString = String(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateString) &&
        !/(Z|[+-]\d{2}:\d{2})$/i.test(dateString)) {
      dateString += "Z";
    }
    return new Date(dateString).getTime();
  };
 const currentUserId = String(
  (currentUserData as any)?.id ??
  (currentUserData as any)?.uid ??
  ""
).toLowerCase();
  const RETENTION_MS = 2 * 60 * 1000;
  const sortAndDedupe = (items: NotificationItem[]) => {
    const now = Date.now();
    const filtered = items.filter((item) => {
      const type = String(item.type ?? "").trim().toLowerCase();
      const reporterId = String(item.reporterUid ?? "").toLowerCase();
      // Hide the creator's own community notifications, including
      // blood requests, registrations and emergency community alerts.
      // Private notifications are unaffected.
      if (
        item.isCommunity &&
        currentUserId &&
        reporterId === currentUserId
      ) {
        return false;
      }
      const created = notificationTime(item.createdAt);
      return Number.isFinite(created) && created > now - RETENTION_MS;
    });
    // Prefer the most recent item when both API and SignalR supplied it.
    filtered.sort(
      (a, b) => notificationTime(b.createdAt) - notificationTime(a.createdAt)
    );
    const seen = new Set<string>();
    return filtered.filter((item) => {
      const type = String(item.type ?? "").trim().toLowerCase();
      const requestId = String(
        item.bloodRequestId ?? item.referenceId ?? ""
      ).trim().toLowerCase();
      // Two notification rows for the SAME blood request should show once.
      // Other event types (responses, donation updates) remain separate.
      const isBloodRequest =
        item.isCommunity &&
        (type === "request" ||
          type === "blood_request" ||
          type === "bloodrequest");
      const key = isBloodRequest && requestId
        ? `blood-request:${requestId}`
        : `${item.isCommunity ? "community" : "private"}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const loadNotifications = async () => {
    try {
      const [privateData, communityData] = await Promise.all([
        apiRequest<any[]>("/api/notifications"),
        apiRequest<any[]>("/api/notifications/community"),
      ]);
      const privateNotifs = (privateData || []).map((n) => normalizeNotification(n, false));
      const communityNotifs = (communityData || []).map((n) => normalizeNotification(n, true));
      setNotifications(sortAndDedupe([...privateNotifs, ...communityNotifs]));
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    let mounted = true;
    loadNotifications();
    startNotificationConnection(
      (raw: Record<string, any>) => {
        if (!mounted) return;
        const item = normalizeNotification(raw, false);
        setNotifications((prev) => sortAndDedupe([item, ...prev]));
      },
      (raw: Record<string, any>) => {
        if (!mounted) return;
        const item = normalizeNotification(raw, true);
        setNotifications((prev) => sortAndDedupe([item, ...prev]));
      }
    ).catch((error: unknown) => console.error("SignalR connection failed:", error));
    // Sync missed SignalR messages and expired SQL rows.
    const syncInterval = setInterval(() => {
      if (mounted) loadNotifications();
    }, 15000);
    return () => {
      mounted = false;
      clearInterval(syncInterval);
      stopNotificationConnection().catch(() => undefined);
    };
  }, [currentUserId]);
  /* =========================================================
     KEEP SELECTED NOTIFICATION UPDATED
  ========================================================= */
  useEffect(() => {
    if (selectedNotif) {
      const updated = notifications.find(
        (n) => n.id === selectedNotif.id
      );
      if (updated) {
        setSelectedNotif(updated);
      }
    }
  }, [notifications]);
  /* =========================================================
     NOTIFICATION PRESS
  ========================================================= */
  const handleNotificationPress = async (
    item: NotificationItem
  ) => {
    if (isSelectionMode) {
      toggleNotificationSelection(item);
      return;
    }
    if (item.unread) {
      setNotifications((previous) =>
        previous.map((notification) =>
          getNotificationKey(notification) === getNotificationKey(item)
            ? { ...notification, unread: false }
            : notification
        )
      );
      try {
        await apiRequest(
          item.isCommunity
            ? `/api/community-notifications/${item.id}/read`
            : `/api/notifications/${item.id}/read`,
          { method: "PATCH" }
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
        await loadNotifications();
      }
    }
    if (item.type === "emergency" || item.type === "emergency_response") {
      setSelectedNotif({ ...item, unread: false });
      setModalVisible(true);
      return;
    }
    const normalizedType = String(item.type || "")
      .trim()
      .toLowerCase();
    const isBloodResponseNotification =
      normalizedType === "blood_request_response" ||
      normalizedType === "bloodrequestresponse";
    if (isBloodResponseNotification) {
      // Notification is informational only.
      // Donor confirmation is managed from Blood Requests > My Requests.
      return;
    }
  };
  const handleDeleteSelectedNotifications = () => {
    const selectedNotifications = notifications.filter((item) =>
      selectedNotificationKeys.includes(getNotificationKey(item))
    );
    if (selectedNotifications.length === 0) return;
    Alert.alert(
      "Delete notifications",
      `Delete ${selectedNotifications.length} selected notification${selectedNotifications.length === 1 ? "" : "s"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(
                selectedNotifications.map((notification) =>
                  apiRequest(
                    notification.isCommunity
                      ? `/api/community-notifications/${notification.id}`
                      : `/api/notifications/${notification.id}`,
                    { method: "DELETE" }
                  )
                )
              );
              setNotifications((previous) =>
                previous.filter(
                  (notification) =>
                    !selectedNotificationKeys.includes(
                      getNotificationKey(notification)
                    )
                )
              );
              clearNotificationSelection();
            } catch (error: any) {
              console.error("Delete notification failed:", error);
              Alert.alert(
                "Delete failed",
                error?.message || "Some notifications could not be deleted."
              );
              await loadNotifications();
            }
          },
        },
      ]
    );
  };
  /* =========================================================
     MARK ALL AS READ
  ========================================================= */
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => notification.unread
    );
    if (unreadNotifications.length === 0) return;
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
    try {
      const communityUnread = unreadNotifications.filter(
        (notification) => notification.isCommunity
      );
      await apiRequest("/api/notifications/read-all", {
        method: "PATCH",
      });
      await Promise.all(
        communityUnread.map((notification) =>
          apiRequest(
            `/api/community-notifications/${notification.id}/read`,
            { method: "PATCH" }
          )
        )
      );
    } catch (error) {
      console.error("Mark all as read failed:", error);
      await loadNotifications();
    }
  };
  /* =========================================================
     CALL USER
  ========================================================= */
  const handleCall = (
    phoneNumber?: string
  ) => {
    if (!phoneNumber) {
      Alert.alert(
        "Contact Unavailable",
        "Contact number is not available."
      );
      return;
    }
    const sanitizedNumber =
      phoneNumber.replace(/[^\d+]/g, "");
    const url = `tel:${sanitizedNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error(
        "An error occurred opening dialer:",
        err
      );
      Alert.alert(
        "Call Failed",
        "Phone calls are not supported on this device."
      );
    });
  };
  /* NORMAL BLOOD REQUEST RESPONDERS */
  const loadBloodRequestResponders = async (
    bloodRequestId: string
  ) => {
    setSelectedBloodRequestId(bloodRequestId);
    setResponderModalVisible(true);
    setRespondersLoading(true);
    try {
      const data =
        await apiRequest<BloodRequestResponder[]>(
          `/api/blood-requests/${bloodRequestId}/responses`
        );
      setBloodResponders(
        (data || []).map((response: any) => ({
          id: String(response.id ?? response.Id),
          bloodRequestId: String(
            response.bloodRequestId ??
            response.BloodRequestId ??
            bloodRequestId
          ),
          donorId: String(
            response.donorId ??
            response.DonorId ??
            ""
          ),
          donorName:
            response.donorName ??
            response.DonorName ??
            "Donor",
          donorPhone:
            response.donorPhone ??
            response.DonorPhone,
          bloodType:
            response.bloodType ??
            response.BloodType,
          status:
            response.status ??
            response.Status ??
            "Pending",
          createdAt:
            response.createdAt ??
            response.CreatedAt,
          updatedAt:
            response.updatedAt ??
            response.UpdatedAt,
        }))
      );
    } catch (error: any) {
      console.error(
        "Could not load blood request responders:",
        error
      );
      setBloodResponders([]);
      Alert.alert(
        "Could Not Load Responders",
        error?.message ||
          "Responder details could not be loaded."
      );
    } finally {
      setRespondersLoading(false);
    }
  };
  const refreshBloodResponders = async () => {
    if (!selectedBloodRequestId) return;
    await loadBloodRequestResponders(
      selectedBloodRequestId
    );
  };
  const runResponderAction = async (response: BloodRequestResponder, action: "confirm" | "reject" | "complete") => {
    if (!selectedBloodRequestId || actionLoading) return;
    setActionLoading(true);
    try {
      await apiRequest(`/api/blood-requests/${selectedBloodRequestId}/responses/${response.id}/${action}`, { method: "PATCH" });
      await refreshBloodResponders(); await loadNotifications();
      Alert.alert(action === "complete" ? "Donation Completed ❤️" : action === "confirm" ? "Donor Confirmed" : "Response Rejected", action === "complete" ? "Donation count and last donation date have been updated." : "Status updated successfully.");
    } catch (error: any) { Alert.alert("Action Failed", error?.message || "Could not update donor response."); }
    finally { setActionLoading(false); }
  };
  const handleConfirmResponder = (r: BloodRequestResponder) => Alert.alert("Confirm Donor", `Confirm ${r.donorName} as donor?`, [{text:"Cancel",style:"cancel"},{text:"Confirm",onPress:()=>runResponderAction(r,"confirm")}]);
  const handleRejectResponder = (r: BloodRequestResponder) => Alert.alert("Reject Donor", `Reject ${r.donorName}'s response?`, [{text:"Cancel",style:"cancel"},{text:"Reject",style:"destructive",onPress:()=>runResponderAction(r,"reject")}]);
  const handleCompleteDonation = (r: BloodRequestResponder) => Alert.alert("Complete Donation", "Only continue after blood has actually been donated. This updates donation count and last donation date.", [{text:"Cancel",style:"cancel"},{text:"Complete",onPress:()=>runResponderAction(r,"complete")}]);
  /* =========================================================
     OFFER HELP / DONATE
  ========================================================= */
  const handleOfferToDonate = async () => {
    if (!selectedNotif || selectedNotif.type !== "emergency") return;
    if (currentUserData?.availableToDonate === false) {
      Alert.alert("Donor Unavailable", "Your donor profile is currently marked unavailable.");
      return;
    }
    const emergencyId =
      selectedNotif.emergencyId || selectedNotif.emergencyRequestId;
    if (!emergencyId) {
      Alert.alert("Error", "Emergency reference was not found.");
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest(`/api/emergencies/${emergencyId}/respond`, { method: "POST" });
      Alert.alert("Response Sent ❤️", "Your emergency response has been sent successfully.");
      setModalVisible(false);
      await loadNotifications();
    } catch (error: any) {
      console.error("Error offering emergency help:", error);
      Alert.alert("Error", error?.message || "Could not send your emergency response.");
    } finally {
      setActionLoading(false);
    }
  };
  /* =========================================================
     CHECK CURRENT USER RESPONSE
  ========================================================= */
  const hasUserResponded = () => false;
  /* =========================================================
     REFRESH
  ========================================================= */
  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };
  /* =========================================================
     LOADING
  ========================================================= */
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Ionicons
            name="notifications-outline"
            size={30}
            color="#DC2626"
          />
        </View>
        <ActivityIndicator
          size="small"
          color="#DC2626"
          style={{ marginTop: 18 }}
        />
        <Text className="mt-3 text-[13px] font-semibold text-gray-400">
          Checking your alerts...
        </Text>
      </View>
    );
  }
  /* =========================================================
     MAIN UI
  ========================================================= */
  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FB]"
      edges={["bottom"]}
    >
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={notifications}
        keyExtractor={(item) => getNotificationKey(item)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={() => handleNotificationPress(item)}
            onLongPress={() => toggleNotificationSelection(item)}
            selected={selectedNotificationKeys.includes(
              getNotificationKey(item)
            )}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#DC2626"]}
            tintColor="#DC2626"
          />
        }
        ListHeaderComponent={
          <View className="mb-5 flex-row items-center justify-between">
            {isSelectionMode ? (
              <>
                <View className="flex-1 flex-row items-center">
                  <TouchableOpacity
                    onPress={clearNotificationSelection}
                    activeOpacity={0.7}
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                    accessibilityLabel="Cancel selection"
                  >
                    <Ionicons name="close" size={21} color="#374151" />
                  </TouchableOpacity>
                  <View>
                    <Text className="text-[18px] font-extrabold text-gray-900">
                      {selectedNotificationKeys.length} selected
                    </Text>
                    <Text className="mt-0.5 text-[11px] font-medium text-gray-400">
                      Choose notifications to remove
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={toggleSelectAllNotifications}
                  activeOpacity={0.75}
                  className="mr-2 flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-2.5"
                  accessibilityLabel="Select all notifications"
                >
                  <Ionicons
                    name={
                      notifications.length > 0 &&
                      notifications.every((item) =>
                        selectedNotificationKeys.includes(
                          getNotificationKey(item)
                        )
                      )
                        ? "checkbox"
                        : "checkbox-outline"
                    }
                    size={18}
                    color="#374151"
                  />
                  <Text className="ml-1.5 text-[11px] font-extrabold text-gray-700">
                    Select All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteSelectedNotifications}
                  activeOpacity={0.75}
                  className="h-10 w-10 items-center justify-center rounded-full bg-red-600"
                  accessibilityLabel="Delete selected notifications"
                >
                  <Ionicons name="trash-outline" size={19} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View className="flex-1">
                  <Text className="text-[19px] font-extrabold text-gray-900">
                    Recent Updates
                  </Text>
                  <Text className="mt-1 text-[12px] font-medium text-gray-400">
                    Stay updated with your blood alerts
                  </Text>
                </View>
                {notifications.some(
                  (notification) => notification.unread
                ) && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    activeOpacity={0.7}
                    className="ml-3 rounded-full bg-red-50 px-3.5 py-2"
                  >
                    <Text className="text-[11px] font-bold text-red-600">
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center px-8 py-24">
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-red-50">
              <Ionicons
                name="notifications-off-outline"
                size={50}
                color="#DC2626"
              />
            </View>
            <Text className="text-[21px] font-extrabold text-gray-900">
              All caught up!
            </Text>
            <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-gray-400">
              No new alerts at the moment. We'll
              notify you when something important
              happens.
            </Text>
          </View>
        }
      />
      {/* =====================================================
          EMERGENCY DETAIL MODAL
      ===================================================== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[78%] rounded-t-[28px] bg-white px-4 pb-5 pt-3">
            {/* Drag Handle */}
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-gray-200" />
            {selectedNotif && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 10,
                }}
              >
                {/* =================================================
                    MODAL HEADER
                ================================================= */}
                <View className="mb-4 flex-row items-center border-b border-gray-100 pb-4">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                    <Ionicons
                      name="warning-outline"
                      size={26}
                      color="#DC2626"
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-[18px] font-extrabold leading-6 text-gray-900"
                      numberOfLines={2}
                    >
                      {selectedNotif.title}
                    </Text>
                    <Text className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-red-600">
                      {selectedNotif.type ===
                      "emergency_response"
                        ? selectedNotif.responseStatus ||
                          "RESPONSE UPDATE"
                        : selectedNotif.category ||
                          "CRITICAL ALERT"}
                    </Text>
                  </View>
                </View>
                {/* =================================================
                    ALERT MESSAGE
                ================================================= */}
                <View className="mb-3 rounded-2xl border border-gray-100 bg-[#F8F9FB] p-3.5">
                  <View className="mb-2 flex-row items-center">
                    <Ionicons
                      name="alert-circle-outline"
                      size={17}
                      color="#DC2626"
                    />
                    <Text className="ml-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                      Emergency Information
                    </Text>
                  </View>
                  <Text className="text-[14px] font-semibold leading-5 text-gray-800">
                    {selectedNotif.message}
                  </Text>
                  {selectedNotif.details ? (
                    <View className="mt-2 rounded-xl bg-white p-2.5">
                      <Text className="text-[13px] font-medium italic leading-5 text-gray-500">
                        "{selectedNotif.details}"
                      </Text>
                    </View>
                  ) : null}
                </View>
                {/* =================================================
                    RESPONSE STATUS
                ================================================= */}
                {selectedNotif.type ===
                  "emergency_response" && (
                  <View className="mb-3 rounded-2xl border border-green-100 bg-green-50 p-3.5">
                    <View className="flex-row items-center">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color="#16A34A"
                        />
                      </View>
                      <View className="ml-3">
                        <Text className="text-[10px] font-extrabold uppercase tracking-wider text-green-600">
                          Donor Response
                        </Text>
                        <Text className="mt-0.5 text-[16px] font-extrabold text-green-700">
                          {selectedNotif.responseStatus ||
                            "Updated"}
                        </Text>
                      </View>
                    </View>
                    {selectedNotif.donorName ? (
                      <Text className="mt-2 text-[12px] font-semibold text-green-700">
                        Donor:{" "}
                        {selectedNotif.donorName}
                      </Text>
                    ) : null}
                  </View>
                )}
                {/* =================================================
                    BLOOD + PHONE
                ================================================= */}
                {selectedNotif.type !==
                  "emergency_response" && (
                  <View className="mb-4 flex-row">
                    {/* Blood */}
                    <View className="mr-1.5 flex-1 items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-3">
                      <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-white">
                        <Ionicons
                          name="water-outline"
                          size={20}
                          color="#DC2626"
                        />
                      </View>
                      <Text className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Blood Needed
                      </Text>
                      <Text className="mt-1 text-[23px] font-extrabold text-red-600">
                        {selectedNotif.bloodType ||
                          "ANY"}
                      </Text>
                    </View>
                    {/* Phone */}
                    <TouchableOpacity
                      onPress={() =>
                        handleCall(
                          selectedNotif.phoneNumber
                        )
                      }
                      activeOpacity={0.8}
                      className="ml-1.5 flex-1 items-center justify-center rounded-2xl border border-gray-100 bg-[#F8F9FB] p-3"
                    >
                      <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-white">
                        <Ionicons
                          name="call-outline"
                          size={19}
                          color="#DC2626"
                        />
                      </View>
                      <Text className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Contact
                      </Text>
                      <Text
                        className="mt-1 text-center text-[13px] font-extrabold text-gray-900"
                        numberOfLines={1}
                      >
                        {selectedNotif.phoneNumber ||
                          "Not available"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* =================================================
                    LOCATION
                ================================================= */}
                {selectedNotif.type !==
                  "emergency_response" && (
                  <View className="mb-3 rounded-2xl border border-gray-100 bg-[#F8F9FB] p-3.5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="mb-2 flex-row items-center">
                          <Ionicons
                            name="location-outline"
                            size={17}
                            color="#DC2626"
                          />
                          <Text className="ml-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                            Emergency Location
                          </Text>
                        </View>
                        <Text className="text-[14px] font-bold leading-5 text-gray-800">
                          {selectedNotif.location?.split(
                            "|"
                          )[0] ||
                            "Location not available"}
                        </Text>
                      </View>
                      {selectedNotif.location?.includes(
                        "|http"
                      ) && (
                        <TouchableOpacity
                          onPress={() => {
                            const url =
                              selectedNotif.location?.split(
                                "|"
                              )[1];
                            if (url) {
                              Linking.openURL(url);
                            }
                          }}
                          activeOpacity={0.8}
                          className="ml-3 h-10 w-10 items-center justify-center rounded-xl bg-red-50"
                        >
                          <Ionicons
                            name="map-outline"
                            size={19}
                            color="#DC2626"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                {/* =================================================
                    REPORTER
                ================================================= */}
                {selectedNotif.type !==
                  "emergency_response" && (
                  <View className="mb-3 flex-row items-center justify-center">
                    <Ionicons
                      name="person-circle-outline"
                      size={17}
                      color="#9CA3AF"
                    />
                    <Text className="ml-1.5 text-[12px] font-medium text-gray-400">
                      Reported by{" "}
                      {selectedNotif.reporterName ||
                        "Community Member"}
                    </Text>
                  </View>
                )}
                {/* =================================================
                    RESPONDERS
                ================================================= */}
                {selectedNotif.type !==
                  "emergency_response" && (
                  <View className="mb-4">
                    <View className="mb-2.5 flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="people-outline"
                          size={18}
                          color="#16A34A"
                        />
                        <Text className="ml-2 text-[13px] font-extrabold text-gray-800">
                          Helpers Responded
                        </Text>
                      </View>
                      <View className="rounded-full bg-green-50 px-2.5 py-0.5">
                        <Text className="text-[11px] font-extrabold text-green-700">
                          {selectedNotif
                            .donorResponses
                            ?.length || 0}
                        </Text>
                      </View>
                    </View>
                    {selectedNotif.donorResponses &&
                    selectedNotif.donorResponses.length >
                      0 ? (
                      <View className="rounded-2xl border border-gray-100 bg-[#F8F9FB] p-3">
                        {selectedNotif.donorResponses.map(
                          (res, index) => (
                            <View
                              key={index}
                              className={`flex-row items-center justify-between ${
                                index !==
                                selectedNotif
                                  .donorResponses!
                                  .length -
                                  1
                                  ? "mb-3 border-b border-gray-200 pb-3"
                                  : ""
                              }`}
                            >
                              <View className="flex-row items-center">
                                <View className="h-9 w-9 items-center justify-center rounded-full bg-green-100">
                                  <Ionicons
                                    name="checkmark"
                                    size={17}
                                    color="#16A34A"
                                  />
                                </View>
                                <View className="ml-3">
                                  <Text className="text-[13px] font-extrabold text-gray-800">
                                    {res.name ||
                                      res.donorName ||
                                      "Donor"}
                                  </Text>
                                  <Text className="mt-0.5 text-[10px] font-semibold text-green-600">
                                    Accepted
                                  </Text>
                                </View>
                              </View>
                              {res.phone ||
                              res.phoneNumber ? (
                                <TouchableOpacity
                                  onPress={() =>
                                    handleCall(
                                      res.phone ||
                                        res.phoneNumber
                                    )
                                  }
                                  activeOpacity={0.8}
                                  className="h-9 w-9 items-center justify-center rounded-full bg-green-50"
                                >
                                  <Ionicons
                                    name="call"
                                    size={16}
                                    color="#16A34A"
                                  />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          )
                        )}
                      </View>
                    ) : (
                      <View className="items-center justify-center rounded-[20px] border border-dashed border-gray-200 bg-[#F8F9FB] py-7">
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                          <Ionicons
                            name="heart-outline"
                            size={25}
                            color="#9CA3AF"
                          />
                        </View>
                        <Text className="mt-2 text-[12px] font-semibold text-gray-400">
                          No donors have responded yet
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {/* =================================================
                    ACTION BUTTONS
                ================================================= */}
                <View className="mt-0.5">
                  {selectedNotif.type !==
                    "emergency_response" &&
                    (hasUserResponded() ? (
                      <View className="mb-2.5 flex-row items-center justify-center rounded-2xl border border-green-200 bg-green-50 py-3.5">
                        <Ionicons
                          name="checkmark-circle"
                          size={21}
                          color="#16A34A"
                        />
                        <Text className="ml-2 text-[14px] font-extrabold text-green-700">
                          RESPONSE ACCEPTED
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={
                          handleOfferToDonate
                        }
                        disabled={actionLoading}
                        activeOpacity={0.9}
                        className="mb-2.5 rounded-2xl bg-red-600"
                      >
                        <View className="flex-row items-center justify-center py-3.5">
                          {actionLoading ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <>
                              <Ionicons
                                name="heart"
                                size={20}
                                color="white"
                              />
                              <Text className="ml-2 text-[15px] font-extrabold text-white">
                                I CAN HELP
                              </Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  {/* Close */}
                  <TouchableOpacity
                    onPress={() =>
                      setModalVisible(false)
                    }
                    activeOpacity={0.8}
                    className="rounded-2xl border border-gray-200 bg-white py-3.5"
                  >
                    <Text className="text-center text-[14px] font-extrabold text-gray-600">
                      CLOSE
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
export default Notification;

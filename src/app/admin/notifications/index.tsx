import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "@/src/lib/backendCompat";
import React, { useEffect, useState } from "react";
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

interface NotificationItem {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  createdAt?: any;
}

const AdminNotifications = () => {
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ==========================================
  // FETCH NOTIFICATIONS
  // ==========================================

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const notificationQuery = query(
        collection(db, "community_notifications"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(notificationQuery);

      const list: NotificationItem[] = [];

      snapshot.forEach((notificationDoc) => {
        list.push({
          id: notificationDoc.id,
          ...notificationDoc.data(),
        });
      });

      setNotifications(list);
    } catch (error) {
      console.error(
        "Error fetching notifications:",
        error
      );

      Alert.alert(
        "Error",
        "Could not load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ==========================================
  // SEND ANNOUNCEMENT
  // ==========================================

  const sendAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert(
        "Required",
        "Please enter title and message."
      );

      return;
    }

    try {
      setSending(true);

      await addDoc(
        collection(db, "community_notifications"),
        {
          type: "announcement",
          title: title.trim(),
          message: message.trim(),
          createdAt: serverTimestamp(),
          unread: true,
          icon: "megaphone",
          color: "#DC2626",
          createdBy: "admin",
        }
      );

      Alert.alert(
        "Success",
        "Announcement sent successfully."
      );

      setTitle("");
      setMessage("");

      await fetchNotifications();
    } catch (error) {
      console.error(
        "Error sending announcement:",
        error
      );

      Alert.alert(
        "Error",
        "Could not send announcement."
      );
    } finally {
      setSending(false);
    }
  };

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
            Notifications
          </Text>

          <Text className="text-xs font-semibold text-gray-400">
            Send announcements to the community
          </Text>
        </View>
      </View>

      {/* Announcement Form */}

      <View className="px-5 pt-5">
        <View className="rounded-3xl border border-red-100 bg-red-50 p-5">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-600">
              <Ionicons
                name="megaphone-outline"
                size={24}
                color="white"
              />
            </View>

            <View className="ml-4">
              <Text className="text-lg font-black text-gray-900">
                Send Announcement
              </Text>

              <Text className="text-xs font-semibold text-gray-500">
                Notify all Blood Care users
              </Text>
            </View>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Announcement title"
            placeholderTextColor="#9CA3AF"
            className="mt-5 rounded-2xl border border-red-100 bg-white px-4 py-4 font-semibold text-gray-900"
          />

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Write announcement message..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            className="mt-3 min-h-[110px] rounded-2xl border border-red-100 bg-white px-4 py-4 font-semibold text-gray-900"
          />

          <TouchableOpacity
            disabled={sending}
            onPress={sendAnnouncement}
            className={`mt-4 items-center rounded-2xl bg-red-600 py-4 ${
              sending ? "opacity-60" : ""
            }`}
          >
            <Text className="text-sm font-black uppercase tracking-wider text-white">
              {sending
                ? "Sending..."
                : "Send Announcement"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Notifications Header */}

      <View className="flex-row items-center justify-between px-5 pb-3 pt-6">
        <Text className="text-xl font-black text-gray-900">
          Recent Notifications
        </Text>

        <TouchableOpacity onPress={fetchNotifications}>
          <Ionicons
            name="refresh-outline"
            size={22}
            color="#DC2626"
          />
        </TouchableOpacity>
      </View>

      {/* Notifications List */}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color="#DC2626"
          />

          <Text className="mt-4 font-semibold text-gray-400">
            Loading Notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons
                name="notifications-outline"
                size={55}
                color="#D1D5DB"
              />

              <Text className="mt-4 font-bold text-gray-400">
                No notifications found
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isEmergency =
              item.type === "emergency";

            const isAnnouncement =
              item.type === "announcement";

            return (
              <View className="mb-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <View className="flex-row items-start">
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-2xl ${
                      isEmergency
                        ? "bg-red-600"
                        : isAnnouncement
                        ? "bg-blue-50"
                        : "bg-purple-50"
                    }`}
                  >
                    <Ionicons
                      name={
                        isEmergency
                          ? "warning-outline"
                          : isAnnouncement
                          ? "megaphone-outline"
                          : "people-outline"
                      }
                      size={23}
                      color={
                        isEmergency
                          ? "white"
                          : isAnnouncement
                          ? "#2563EB"
                          : "#8B5CF6"
                      }
                    />
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="text-base font-black text-gray-900">
                      {item.title || "Notification"}
                    </Text>

                    <Text className="mt-2 text-xs font-medium leading-5 text-gray-500">
                      {item.message ||
                        "No message"}
                    </Text>

                    <View className="mt-3 self-start rounded-full bg-gray-100 px-3 py-1">
                      <Text className="text-[9px] font-black uppercase text-gray-500">
                        {item.type ||
                          "community"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default AdminNotifications;
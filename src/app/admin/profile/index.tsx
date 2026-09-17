import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "@/src/lib/backendCompat";
import React from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../../../config/backendConfig";
import { useUserStore } from "../../../store/userStore";

const AdminProfile = () => {
  const router = useRouter();

  const { user, clearUser } = useUserStore();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",

          onPress: async () => {
            try {
              clearUser();

              await signOut(auth);

              router.replace("/(auth)" as any);
            } catch (error) {
              console.error(
                "Admin logout error:",
                error
              );

              Alert.alert(
                "Error",
                "Could not logout."
              );
            }
          },
        },
      ]
    );
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
            Admin Profile
          </Text>

          <Text className="text-xs font-semibold text-gray-400">
            Account information
          </Text>
        </View>
      </View>

      <View className="px-6 pt-8">
        {/* Avatar */}

        <View className="items-center">
          <View className="h-28 w-28 items-center justify-center rounded-full bg-red-50">
            <Ionicons
              name="shield-checkmark"
              size={55}
              color="#DC2626"
            />
          </View>

          <Text className="mt-5 text-2xl font-black text-gray-900">
            {user?.fullName || "System Admin"}
          </Text>

          <View className="mt-2 rounded-full bg-red-50 px-4 py-2">
            <Text className="text-xs font-black uppercase tracking-wider text-red-600">
              Administrator
            </Text>
          </View>
        </View>

        {/* Information */}

        <View className="mt-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <ProfileItem
            icon="person-outline"
            label="Full Name"
            value={
              user?.fullName ||
              "System Admin"
            }
          />

          <ProfileItem
            icon="mail-outline"
            label="Email"
            value={
              user?.email ||
              "admin@bloodcare.com"
            }
          />

          <ProfileItem
            icon="shield-checkmark-outline"
            label="Role"
            value="Admin"
          />

          <ProfileItem
            icon="checkmark-circle-outline"
            label="Account Status"
            value={
              user?.isActive === false
                ? "Disabled"
                : "Active"
            }
            last
          />
        </View>

        {/* Security */}

        <Text className="mt-8 text-sm font-black uppercase tracking-widest text-gray-400">
          Security
        </Text>

        <View className="mt-3 rounded-3xl border border-gray-100 bg-white">
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center px-5 py-5"
          >
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
              <Ionicons
                name="log-out-outline"
                size={22}
                color="#DC2626"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="font-black text-gray-900">
                Logout
              </Text>

              <Text className="mt-1 text-xs font-semibold text-gray-400">
                Sign out from admin panel
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const ProfileItem = ({
  icon,
  label,
  value,
  last = false,
}: {
  icon: any;
  label: string;
  value: string;
  last?: boolean;
}) => {
  return (
    <View
      className={`flex-row items-center py-4 ${
        !last
          ? "border-b border-gray-100"
          : ""
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
        <Ionicons
          name={icon}
          size={19}
          color="#6B7280"
        />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-[10px] font-black uppercase tracking-wider text-gray-400">
          {label}
        </Text>

        <Text className="mt-1 text-sm font-bold text-gray-800">
          {value}
        </Text>
      </View>
    </View>
  );
};

export default AdminProfile;
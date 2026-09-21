import { Redirect } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUserStore } from "../../../store/userStore";

export default function InventoryIndex() {
  const { user, loading } = useUserStore();

  // Profile load hone tak
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FC]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color="#DC2626"
          />

          <Text className="mt-3 text-sm font-semibold text-gray-500">
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // MAIN ADMIN
  // Sirf registered Blood Banks dekhega
  // ==========================================
  if (user?.role === "admin") {
    return (
      <Redirect
        href={"/admin/inventory/bloodbanks" as any}
      />
    );
  }

  // ==========================================
  // BLOOD BANK ADMIN
  // Stock + Expiry + Contact dekhega
  // ==========================================
  if (user?.role === "bloodBankAdmin") {
    return (
      <Redirect
        href={"/admin/inventory/management" as any}
      />
    );
  }

  // ==========================================
  // NORMAL USER
  // Admin inventory access nahi
  // ==========================================
  return <Redirect href={"/(tabs)" as any} />;
}

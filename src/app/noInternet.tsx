import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";

const NoInternet = () => {
  const router = useRouter();

  const handleRetry = () => {
    // This will re-trigger the RootLayout's handleRouting logic
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 items-center justify-center px-8">
        {/* Animated-like Icon Container */}
        <View className="mb-8 h-40 w-40 items-center justify-center rounded-full bg-red-50">
          <View className="h-32 w-32 items-center justify-center rounded-full bg-red-100">
            <Ionicons name="wifi-outline" size={80} color="#DC2626" />
            {/* Small 'x' badge */}
            <View className="absolute bottom-6 right-6 h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-red-600">
              <Ionicons name="close" size={16} color="white" />
            </View>
          </View>
        </View>

        {/* Text Section */}
        <Text className="mb-3 text-center text-3xl font-black tracking-tight text-gray-900">
          Connection Lost
        </Text>
        <Text className="mb-10 text-center text-lg font-medium leading-6 text-gray-400">
          Oops! It seems like you're not connected to the internet. Please check
          your connection and try again.
        </Text>

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={handleRetry}
          activeOpacity={0.8}
          className="w-full overflow-hidden rounded-2xl bg-red-600 shadow-xl shadow-red-200"
        >
          <View className="items-center py-4">
            <Text className="text-lg font-black uppercase tracking-widest text-white">
              Try Again
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => console.log("Open Settings")}
          className="mt-6 flex-row items-center"
        >
          <Ionicons name="settings-outline" size={18} color="#9CA3AF" />
          <Text className="ml-2 text-base font-bold text-gray-400">
            Check Device Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer Branding */}
      <View className="mb-10 items-center">
        <View className="flex-row items-center opacity-20">
          <Ionicons name="heart" size={16} color="#DC2626" />
          <Text className="ml-2 text-xs font-black uppercase tracking-widest text-gray-900">
            BloodCare Connect
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default NoInternet;

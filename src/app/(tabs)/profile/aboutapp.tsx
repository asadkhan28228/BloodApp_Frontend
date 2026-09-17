import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Aboutapp = () => {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar
          barStyle={"light-content"}
          backgroundColor={"transparent"}
          translucent
        />
        <View className="items-center py-10 px-6">
          <View className="h-24 w-24 items-center justify-center rounded-3xl bg-red-50 shadow-sm mb-4">
            <Ionicons name="heart" size={60} color="#DC2626" />
          </View>
          <Text className="text-3xl font-black text-gray-900">BloodCare</Text>
          <Text className="text-red-600 font-bold tracking-widest uppercase text-xs mt-1">
            Saving Lives Together
          </Text>
        </View>

        <View className="px-6 pb-10">
          <View className="mb-8">
            <Text className="text-lg font-black text-gray-900 mb-2">
              Our Mission
            </Text>
            <Text className="text-gray-500 leading-6 font-medium">
              At BloodCare, our mission is to ensure that no life is lost due to
              the unavailability of blood. We bridge the gap between donors and
              recipients by providing a fast, reliable, and easy-to-use
              platform.
            </Text>
          </View>

          <View className="mb-8">
            <Text className="text-lg font-black text-gray-900 mb-2">
              Key Features
            </Text>
            <View className="space-y-4 gap-4">
              <FeatureItem
                icon="search-outline"
                title="Real-time Search"
                desc="Find blood donors of specific types near your location instantly."
              />
              <FeatureItem
                icon="notifications-outline"
                title="Urgent Requests"
                desc="Post urgent blood requests and notify nearby potential donors."
              />
              <FeatureItem
                icon="stats-chart-outline"
                title="Impact Tracking"
                desc="See how many lives you've helped save through your donations."
              />
            </View>
          </View>

          <View className="bg-red-50 p-6 rounded-3xl">
            <Text className="text-red-900 font-black text-base mb-1">
              Developer Info
            </Text>
            <Text className="text-red-700 font-medium text-sm">
              Developed by Asad Khan as a Final Year Project to leverage
              technology for social good and humanitarian support.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const FeatureItem = ({ icon, title, desc }: any) => (
  <View className="flex-row items-start">
    <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
      <Ionicons name={icon} size={20} color="#DC2626" />
    </View>
    <View className="ml-4 flex-1">
      <Text className="text-base font-bold text-gray-900">{title}</Text>
      <Text className="text-sm text-gray-400 font-medium leading-5">
        {desc}
      </Text>
    </View>
  </View>
);

export default Aboutapp;

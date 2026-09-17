import React from "react";
import { ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Privacypolicy = () => {
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
        <View className="p-6">
          <PolicySection
            title="1. Information We Collect"
            content="We collect personal information such as your name, email address, blood group, and location to provide you with blood donation services. This data is essential for matching donors with recipients."
          />

          <PolicySection
            title="2. How We Use Your Data"
            content="Your blood group and location are visible to other users when you are available to donate or when you post a request. Your contact information is only shared when a mutual match is confirmed for a donation."
          />

          <PolicySection
            title="3. Data Security"
            content="We take the security of your data seriously. All personal information is stored securely using industry-standard encryption through backend services. We do not sell or share your data with third-party advertisers."
          />

          <PolicySection
            title="4. User Control"
            content="You have full control over your visibility. You can toggle your 'Available to Donate' status at any time from your profile settings. You can also request to delete your account and all associated data."
          />

          <PolicySection
            title="5. Changes to Policy"
            content="We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the version info."
          />

          <View className="mt-8 border-t border-gray-100 pt-6 items-center">
            <Text className="text-gray-400 text-xs font-medium">
              Last Updated: May 1, 2026
            </Text>
            <Text className="text-gray-400 text-xs font-medium mt-1">
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PolicySection = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) => (
  <View className="mb-6">
    <Text className="text-lg font-bold text-gray-900 mb-2">{title}</Text>
    <Text className="text-gray-500 leading-6 font-medium">{content}</Text>
  </View>
);

export default Privacypolicy;

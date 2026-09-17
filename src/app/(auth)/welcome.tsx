import { useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Welcome = () => {
  const router = useRouter();

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("hasSeenWelcome", "true");
    router.replace("/(auth)/register");
  };

  const handleSignIn = async () => {
    await AsyncStorage.setItem("hasSeenWelcome", "true");
    router.replace("/(auth)");
  };

  return (
    <View className="flex-1">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <ImageBackground
        source={require("../../assets/images/welcome_bg.png")}
        className="flex-1"
        resizeMode="cover"
      >
        {/* Overlay to ensure text readability */}
        <View className="flex-1 bg-black/30 bg-opacity-40">
          <SafeAreaView className="flex-1">
            <View className="flex-1 px-8 pb-12">
              {/* Hero Text Section - Centered and Refined */}
              <View className="mt-20 items-center justify-center">
                <Text className="text-center text-5xl font-black tracking-tight text-white">
                  Every Drop{"\n"}
                  <Text className="text-red-500 text-5xl">Save Lives</Text>
                </Text>
                <View className="mt-8 h-1 w-16 rounded-full bg-red-500" />
                <Text className="mt-8 text-center text-xl leading-8 text-white/90 font-medium">
                  Be the reason for someone`&apos;`s heartbeat. Your act of
                  kindness can give someone a second chance at life.
                </Text>
              </View>
              <View className="flex-1" />

              {/* Bottom Section - Buttons */}
              <View className="space-y-4 gap-4">
                <TouchableOpacity
                  onPress={handleGetStarted}
                  activeOpacity={0.9}
                  className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/20"
                >
                  <View className="items-center py-4">
                    <Text className="text-lg font-bold text-red-600">
                      Get Started
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSignIn}
                  activeOpacity={0.8}
                  className="rounded-2xl border-2 border-white/80 bg-white/10 backdrop-blur-md"
                >
                  <View className="items-center py-4">
                    <Text className="text-lg font-bold text-white">
                      Sign In
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </View>
  );
};

export default Welcome;

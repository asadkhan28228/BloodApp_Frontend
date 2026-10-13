
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "@/src/lib/backendCompat";
import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../config/backendConfig";

const ForgotPassword = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // =====================================================
  // HANDLE FORGOT PASSWORD
  // =====================================================

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Required field
    if (!normalizedEmail) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    // 2. Email validation
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // 3. Directly call .NET Forgot Password API
      // No protected users collection request

      await sendPasswordResetEmail(auth, normalizedEmail);

      // 4. Success message
      Alert.alert(
        "Reset Link Requested",
        "If an account exists with this email, password reset instructions will be sent.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Backend Reset Error:", error);

      const errorMessage =
        error?.message ||
        "Failed to send reset email. Please try again.";

      Alert.alert("Password Reset Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <View className="flex-1 bg-white">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            className="px-6 py-8"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View className="mb-12 mt-4 items-center justify-center">
              <Text className="text-center text-4xl font-black tracking-tighter text-gray-900">
                Recover Access
              </Text>

              <View className="mt-4 h-1.5 w-12 rounded-full bg-red-500" />

              <Text className="mt-6 text-center text-lg font-medium text-gray-400">
                Enter your registered email and we'll{"\n"}
                send instructions to reset your password.
              </Text>
            </View>

            {/* Form Section */}
            <View className="flex-1 space-y-6">
              <View className="mb-8">
                <Text className="mb-3 ml-1 text-sm font-bold uppercase tracking-widest text-gray-400">
                  Registered Email
                </Text>

                <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm shadow-black/5">
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#6B7280"
                    style={{ marginRight: 12 }}
                  />

                  <TextInput
                    className="flex-1 text-base font-semibold text-gray-900"
                    placeholder="name@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Send Reset Link Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.9}
                className={`overflow-hidden rounded-2xl bg-red-600 shadow-2xl shadow-red-600/30 ${
                  isLoading ? "opacity-70" : ""
                }`}
              >
                <View className="items-center py-5">
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-lg font-black uppercase tracking-widest text-white">
                      Send Reset Link
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="mt-auto items-center pb-6">
              <Text className="text-sm font-medium text-gray-400">
                Found your password?{" "}
                <Text
                  onPress={() => {
                    if (!isLoading) {
                      router.back();
                    }
                  }}
                  className="text-red-600"
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default ForgotPassword;

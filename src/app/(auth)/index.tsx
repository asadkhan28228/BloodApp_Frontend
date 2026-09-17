import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { loginWithBackend } from "@/src/lib/backendCompat";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await loginWithBackend(email, password);
      router.replace("/(tabs)/home" as any);
    } catch (error: any) {
      console.error("Backend Login Error:", error);

      let errorMessage = "An error occurred during sign in.";

      if (error?.status === 400 || error?.status === 401) {
        errorMessage = "Invalid email or password.";
      } else if (error?.code === "NETWORK_ERROR") {
        errorMessage = "Cannot connect to the backend. Check that the ASP.NET Core API is running.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Line 57: justifyContent center hataya aur pt-6 add kiya */}
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            className="px-6 pt-20"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Line 62: py-4 ko pb-4 kiya taake top padding khatam ho */}
            <View className="w-full pt-2 pb-4">
              {/* Header Section */}
              <View className="items-center mb-6">
                <View className="h-20 w-20 items-center justify-center rounded-2xl bg-red-600 shadow-md shadow-red-500/20 mb-3">
                  <Ionicons name="water" size={45} color="white" />
                </View>

                <Text className="text-3xl font-bold text-gray-900 tracking-tight text-center">
                  Welcome Back
                </Text>

                <Text className="mt-2 text-center text-base text-gray-500 leading-relaxed">
                  Sign in to continue saving lives{"\n"}with every donation.
                </Text>
              </View>

              {/* Form Section */}
              <View className="w-full">
                {/* Email Input */}
                <View className="mb-4">
                  <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                    Email Address
                  </Text>
                  <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-red-500 focus:bg-white">
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#6B7280"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-base text-gray-900 font-medium h-full py-0"
                      style={{ textAlignVertical: "center" }}
                      placeholder="name@example.com"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View className="mb-5">
                  <View className="mb-1.5 flex-row justify-between items-center">
                    <Text className="text-sm font-semibold text-gray-700">
                      Password
                    </Text>
                    <TouchableOpacity
                      onPress={() => !isLoading && router.push("/forgot")}
                    >
                      <Text className="text-sm font-semibold text-red-600">
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-red-500 focus:bg-white">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#6B7280"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-base text-gray-900 font-medium h-full py-0"
                      style={{ textAlignVertical: "center" }}
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="p-1"
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  className={`h-12 items-center justify-center rounded-xl bg-red-600 shadow-md shadow-red-600/30 ${
                    isLoading ? "opacity-70" : ""
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base font-bold text-white tracking-wide">
                      Sign In
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Create Account Link */}
                <TouchableOpacity
                  onPress={() => !isLoading && router.push("/register")}
                  activeOpacity={0.7}
                  className="mt-4 py-1 items-center"
                >
                  <Text className="text-sm font-medium text-gray-600">
                    New to the mission?{" "}
                    <Text className="font-bold text-red-600">
                      Create Account
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default Login;
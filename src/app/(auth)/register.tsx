import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { registerWithBackend } from "@/src/lib/backendCompat";
import * as Location from "expo-location";
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


const BloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const Register = () => {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBloodType, setSelectedBloodType] = useState("O+");
  const [gender, setGender] = useState("Male");
  const [showBloodTypePicker, setShowBloodTypePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState("");

  const handleRegister = async () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=]).{8,}$/;

  const pakPhoneRegex = /^(?:\+92|0)3\d{9}$/;

  const nameRegex = /^[a-zA-Z ]{2,50}$/;

  // =========================================================
  // VALIDATION
  // =========================================================

  if (
    !email ||
    !password ||
    !fullName ||
    !selectedBloodType ||
    !phoneNumber ||
    !location
  ) {
    alert("All fields are required");
    return;
  }

  if (!nameRegex.test(fullName) || fullName.length > 50) {
    alert(
      "Please enter a valid name with only alphabets and spaces and length must be less than 50"
    );
    return;
  }

  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address");
    return;
  }

  if (!passwordRegex.test(password)) {
    alert(
      "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
    );
    return;
  }

  if (!pakPhoneRegex.test(phoneNumber)) {
    alert(
      "Please enter a valid Pakistani phone number (e.g. +923XXXXXXXXX or 03XXXXXXXXX)"
    );
    return;
  }

  setIsLoading(true);

  try {
    // =========================================================
    // LOCATION
    // =========================================================

    let finalLocation = location.trim();
    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      const freshLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      latitude = freshLocation.coords.latitude;
      longitude = freshLocation.coords.longitude;

      const geoResult =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

      finalLocation =
        geoResult?.[0]?.city ||
        geoResult?.[0]?.subregion ||
        geoResult?.[0]?.region ||
        finalLocation;
    } catch (locationError) {
      console.log(
        "GPS location unavailable during registration:",
        locationError
      );

      // Try converting manually entered location to coordinates
      try {
        const geocodedLocation =
          await Location.geocodeAsync(finalLocation);

        const matchedLocation =
          geocodedLocation?.[0];

        if (matchedLocation) {
          latitude = matchedLocation.latitude;
          longitude = matchedLocation.longitude;
        }
      } catch (geoError) {
        console.log(
          "Manual location geocoding failed:",
          geoError
        );
      }
    }

    // =========================================================
    // REGISTER USER WITH ASP.NET BACKEND
    // =========================================================

    await registerWithBackend({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password,
      bloodType: selectedBloodType,
      gender,
      location: finalLocation,
      latitude,
      longitude,
    });

    // =========================================================
    // IMPORTANT:
    // Client-side notification write removed.
    //
    // Backend is now responsible for:
    // 1. Creating the user
    // 2. Saving registration notification
    // 3. Publishing CommunityNotification through SignalR
    // =========================================================

    alert("Account Created Successfully!");

    // Go to login screen after successful registration
    router.replace("/");
  } catch (error: any) {
    console.error("Registration Error:", error);

    let message =
      "Something went wrong. Please try again.";

    // =========================================================
    // ASP.NET / API ERROR HANDLING
    // =========================================================

    if (error?.message) {
      message = error.message;
    }

    alert(message);
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
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            className="px-6 pt-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="w-full pb-4">
              {/* Header Section */}
              <View className="items-center mb-6">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-600 shadow-md shadow-red-500/20 mb-3">
                  <Ionicons name="water" size={36} color="white" />
                </View>

                <Text className="text-3xl font-bold text-gray-900 tracking-tight text-center">
                  Join the Mission
                </Text>

                <Text className="mt-1 text-center text-sm text-gray-500 leading-relaxed">
                  Create an account and start saving lives{"\n"}in your community.
                </Text>
              </View>

              {/* Form Section */}
              <View className="w-full">
                {/* Full Name */}
                <View className="mb-3.5">
                  <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                    Full Name
                  </Text>
                  <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-red-500 focus:bg-white">
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#6B7280"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-base text-gray-900 font-medium h-full py-0"
                      style={{ textAlignVertical: "center" }}
                      placeholder="John Doe"
                      placeholderTextColor="#9CA3AF"
                      value={fullName}
                      onChangeText={setFullName}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View className="mb-3.5">
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

                {/* Phone Number */}
                <View className="mb-3.5">
                  <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                    Phone Number
                  </Text>
                  <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-red-500 focus:bg-white">
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color="#6B7280"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-base text-gray-900 font-medium h-full py-0"
                      style={{ textAlignVertical: "center" }}
                      placeholder="e.g. +92 300 1234567"
                      placeholderTextColor="#9CA3AF"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Location */}
                <View className="mb-3.5">
                  <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                    Location
                  </Text>
                  <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-red-500 focus:bg-white">
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#6B7280"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-base text-gray-900 font-medium h-full py-0"
                      style={{ textAlignVertical: "center" }}
                      placeholder="e.g. City, Pakistan"
                      placeholderTextColor="#9CA3AF"
                      value={location}
                      onChangeText={setLocation}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Blood Type Picker */}
                <View className="mb-3.5">
                  <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                    Blood Type
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      !isLoading && setShowBloodTypePicker(!showBloodTypePicker)
                    }
                    activeOpacity={0.7}
                    className={`flex-row items-center h-12 px-3.5 border border-gray-200 bg-gray-50 ${
                      showBloodTypePicker
                        ? "rounded-t-xl border-b-0"
                        : "rounded-xl"
                    }`}
                  >
                    <Ionicons
                      name="water-outline"
                      size={20}
                      color="#6B7280"
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      className={`flex-1 text-base font-medium ${
                        selectedBloodType ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {selectedBloodType || "Select Blood Type"}
                    </Text>
                    <Ionicons
                      name={
                        showBloodTypePicker ? "chevron-up" : "chevron-down"
                      }
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>

                  {showBloodTypePicker && (
                    <View className="rounded-b-xl border border-t-0 border-gray-200 bg-gray-50 px-3 pb-3 pt-1">
                      <View className="flex-row flex-wrap justify-between gap-y-2">
                        {BloodTypes.map((type) => (
                          <TouchableOpacity
                            key={type}
                            onPress={() => {
                              setSelectedBloodType(type);
                              setShowBloodTypePicker(false);
                            }}
                            className={`h-10 w-[23%] items-center justify-center rounded-lg border ${
                              selectedBloodType === type
                                ? "border-red-600 bg-red-100"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <Text
                              className={`text-sm font-bold ${
                                selectedBloodType === type
                                  ? "text-red-600"
                                  : "text-gray-700"
                              }`}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Gender Selector */}
                <View className="mb-3.5">
                  <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                    Gender
                  </Text>
                  <View className="flex-row gap-3">
                    {["Male", "Female"].map((item) => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setGender(item)}
                        activeOpacity={0.8}
                        className={`flex-1 flex-row items-center justify-center h-12 rounded-xl border ${
                          gender === item
                            ? "border-red-600 bg-red-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <Ionicons
                          name={item === "Male" ? "male" : "female"}
                          size={18}
                          color={gender === item ? "#DC2626" : "#6B7280"}
                        />
                        <Text
                          className={`ml-2 font-semibold text-sm ${
                            gender === item ? "text-red-600" : "text-gray-600"
                          }`}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Password */}
                <View className="mb-5">
                  <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                    Password
                  </Text>
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

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleRegister}
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
                      Create Account
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Sign In Navigation Link */}
                <TouchableOpacity
                  onPress={() => !isLoading && router.replace("/")}
                  activeOpacity={0.7}
                  className="mt-4 py-2 items-center"
                >
                  <Text className="text-sm font-medium text-gray-600">
                    Already part of the mission?{" "}
                    <Text className="font-bold text-red-600">Sign In</Text>
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

export default Register;
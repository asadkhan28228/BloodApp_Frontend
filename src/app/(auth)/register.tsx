import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";

import { registerWithBackend } from "@/src/lib/backendCompat";

import * as Location from "expo-location";

import React, { useState } from "react";

import {

  Alert,
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const normalizePhone = (value: string) => {

    const compact = value.replace(/[\s()-]/g, "");

    return compact.startsWith("+92") ? `0${compact.slice(3)}` : compact;

  };

  const clearError = (field: string) => {

    setErrors((previous) => ({ ...previous, [field]: "" }));

  };

  const handleRegister = async () => {

    if (isLoading) return;

    const name = fullName.trim().replace(/\s+/g, " ");

    const normalizedEmail = email.trim().toLowerCase();

    const normalizedPhone = normalizePhone(phoneNumber);

    const enteredLocation = location.trim();

    const nextErrors: Record<string, string> = {};

    if (!name) nextErrors.fullName = "Full name is required.";

    else if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name) || name.length < 2 || name.length > 50)

      nextErrors.fullName = "Enter a valid name (2–50 letters and spaces).";

    if (!normalizedEmail) nextErrors.email = "Email address is required.";

    else if (normalizedEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))

      nextErrors.email = "Enter a valid email address.";

    if (!phoneNumber.trim()) nextErrors.phoneNumber = "Phone number is required.";

    else if (!/^03\d{9}$/.test(normalizedPhone))

      nextErrors.phoneNumber = "Enter a Pakistani number, e.g. 03001234567 or +923001234567.";

    if (!enteredLocation) nextErrors.location = "Location is required.";

    else if (enteredLocation.length > 200) nextErrors.location = "Location cannot exceed 200 characters.";

    if (!BloodTypes.includes(selectedBloodType)) nextErrors.bloodType = "Select a valid blood type.";

    if (!["Male", "Female"].includes(gender)) nextErrors.gender = "Select your gender.";

    if (!password) nextErrors.password = "Password is required.";

    else if (password.length > 128 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/.test(password))

      nextErrors.password = "Use 8–128 characters with uppercase, lowercase, a number and a special character.";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);

    try {

      let finalLocation = enteredLocation;

      let latitude: number | null = null;

      let longitude: number | null = null;

      // Preserve the manually entered location; resolve its coordinates if possible.

      try {

        const matches = await Location.geocodeAsync(enteredLocation);

        if (matches?.[0]) {

          latitude = matches[0].latitude;

          longitude = matches[0].longitude;

        }

      } catch (geoError) {

        console.log("Location geocoding unavailable:", geoError);

      }

      await registerWithBackend({

        fullName: name,

        email: normalizedEmail,

        phoneNumber: normalizedPhone,

        password,

        bloodType: selectedBloodType,

        gender,

        location: finalLocation,

        latitude,

        longitude,

      });

      alert("Registration successful. Please check your email to verify your account.");

      router.replace("/");

    } catch (error: any) {
      console.error("Registration Error:", error);

      const response = error?.response?.data ?? error?.data;
      const serverMessage = response?.message ?? error?.message ?? "";
      const message = String(serverMessage);
      const normalized = message.toLowerCase();
      const field = String(response?.field ?? "").toLowerCase();

      if (field === "phonenumber" ||
          (normalized.includes("phone") &&
           (normalized.includes("already") || normalized.includes("registered")))) {
        const text = "This phone number is already registered. Please use a different number or sign in.";
        setErrors((previous) => ({ ...previous, phoneNumber: text }));
        Alert.alert("Phone Number Already Registered", text);
      } else if (field === "email" ||
                 (normalized.includes("email") &&
                  (normalized.includes("already") || normalized.includes("registered")))) {
        const text = "This email address is already registered. Please use a different email or sign in.";
        setErrors((previous) => ({ ...previous, email: text }));
        Alert.alert("Email Already Registered", text);
      } else {
        Alert.alert("Registration Failed", message || "Unable to create your account. Please try again.");
      }
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

                      onChangeText={(value) => { setFullName(value); clearError("fullName"); }}

                      editable={!isLoading}

                    />

                  </View>

                {errors.fullName ? <Text className="mt-1 text-xs text-red-600">{errors.fullName}</Text> : null}

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

                      onChangeText={(value) => { setEmail(value); clearError("email"); }}

                      keyboardType="email-address"

                      autoCapitalize="none"

                      editable={!isLoading}

                    />

                  </View>

                {errors.email ? <Text className="mt-1 text-xs text-red-600">{errors.email}</Text> : null}

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

                      onChangeText={(value) => { setPhoneNumber(value); clearError("phoneNumber"); }}

                      keyboardType="phone-pad"

                      editable={!isLoading}

                    />

                  </View>

                {errors.phoneNumber ? <Text className="mt-1 text-xs text-red-600">{errors.phoneNumber}</Text> : null}

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

                      onChangeText={(value) => { setLocation(value); clearError("location"); }}

                      editable={!isLoading}

                    />

                  </View>

                {errors.location ? <Text className="mt-1 text-xs text-red-600">{errors.location}</Text> : null}

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

                                clearError("bloodType");

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

                {errors.bloodType ? <Text className="mt-1 text-xs text-red-600">{errors.bloodType}</Text> : null}

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

                        onPress={() => { setGender(item); clearError("gender"); }}

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

                {errors.gender ? <Text className="mt-1 text-xs text-red-600">{errors.gender}</Text> : null}

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

                      onChangeText={(value) => { setPassword(value); clearError("password"); }}

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

                {errors.password ? <Text className="mt-1 text-xs text-red-600">{errors.password}</Text> : null}

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
import { db, auth } from "@/src/config/backendConfig";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { addDoc, collection, getDocs, serverTimestamp } from "@/src/lib/backendCompat";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStore } from "@/src/store/userStore";

const BloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const UrgencyLevels = ["Normal", "Urgent", "Critical"] as const;
type UrgencyLevel = (typeof UrgencyLevels)[number];

const BloodRequests = () => {
  const { user: currentUserData } = useUserStore();
  const [patientName, setPatientName] = useState("");
  const [selectedBloodType, setSelectedBloodType] = useState("");
  const [showBloodTypePicker, setShowBloodTypePicker] = useState(false);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | "">("");
  const [hospitalName, setHospitalName] = useState("");

  // `location` is the value stored in backend database. It can contain:
  // "address|google-maps-url".
  const [location, setLocation] = useState("");
  // `locationDisplay` is only for the TextInput so the user never sees
  // the long Google Maps URL inside the form field.
  const [locationDisplay, setLocationDisplay] = useState("");

  const [contactPhone, setContactPhone] = useState("");
  const [unitsNeeded, setUnitsNeeded] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentLocationData, setCurrentLocationData] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");

  const formProgress = useMemo(() => {
    const fields = [
      patientName.trim(),
      selectedBloodType,
      selectedUrgency,
      hospitalName.trim(),
      locationDisplay.trim(),
      contactPhone.trim(),
      unitsNeeded.trim(),
    ];

    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [
    patientName,
    selectedBloodType,
    selectedUrgency,
    hospitalName,
    locationDisplay,
    contactPhone,
    unitsNeeded,
  ]);

  const getInputBorderClass = (hasValue: boolean) =>
    hasValue ? "border-gray-300" : "border-gray-200";

  const handleOpenMapPicker = async () => {
    try {
      setShowLocationModal(true);
      setLocationLoading(true);
      setManualLocationInput(locationDisplay);
      setCurrentLocationData(null);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Location permission is required to use your current GPS location. You can still enter the address manually.",
          [
            {
              text: "OK",
              onPress: () => setLocationLoading(false),
            },
          ],
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      let fullAddress = "Location found";

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        fullAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.postalCode,
        ]
          .filter(Boolean)
          .join(", ")
          .trim() || "Location found";
      }

      setCurrentLocationData({
        address: fullAddress,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setManualLocationInput(fullAddress);
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. You can enter the address manually.",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleConfirmLocation = () => {
    const address = manualLocationInput.trim();

    if (!address) {
      Alert.alert("Location Required", "Please enter or select a location.");
      return;
    }

    const mapsUrl = currentLocationData
      ? `https://www.google.com/maps?q=${currentLocationData.latitude},${currentLocationData.longitude}`
      : `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

    setLocation(`${address}|${mapsUrl}`);
    setLocationDisplay(address);
    setSelectedCoordinates(
      currentLocationData
        ? {
            latitude: currentLocationData.latitude,
            longitude: currentLocationData.longitude,
          }
        : null,
    );
    setShowLocationModal(false);
    setCurrentLocationData(null);
    setManualLocationInput("");
  };

  const handleLocationTextChange = (text: string) => {
    setLocationDisplay(text);
    setLocation(text);

    // Once the user edits the address manually, the old GPS point may no
    // longer represent the entered address, so clear the GPS data.
    setCurrentLocationData(null);
    setSelectedCoordinates(null);
  };

  const handleSubmitRequest = async () => {
    const normalizedPhone = contactPhone.trim().replace(/\s+/g, "");
    const pakPhoneRegex = /^(?:\+92|0)3\d{9}$/;
    const units = Number(unitsNeeded);

    if (!patientName.trim()) {
      Alert.alert("Patient Name Required", "Please enter the patient's name.");
      return;
    }

    if (!selectedBloodType) {
      Alert.alert("Blood Type Required", "Please select the required blood type.");
      return;
    }

    if (!selectedUrgency) {
      Alert.alert("Urgency Required", "Please select the urgency level.");
      return;
    }

    if (!hospitalName.trim()) {
      Alert.alert("Hospital Required", "Please enter the hospital or medical center name.");
      return;
    }

    if (!locationDisplay.trim()) {
      Alert.alert("Location Required", "Please enter the emergency location or use GPS.");
      return;
    }

    if (!normalizedPhone) {
      Alert.alert("Phone Required", "Please enter a contact phone number.");
      return;
    }

    if (!pakPhoneRegex.test(normalizedPhone)) {
      Alert.alert(
        "Invalid Phone Number",
        "Use a Pakistani number such as +923341234567 or 03341234567.",
      );
      return;
    }

    if (!unitsNeeded.trim()) {
      Alert.alert("Units Required", "Please enter the number of blood units needed.");
      return;
    }

    if (!Number.isInteger(units) || units <= 0 || units > 100) {
      Alert.alert("Invalid Units", "Units must be a whole number between 1 and 100.");
      return;
    }

    setIsLoading(true);

    try {
      const currentUid = auth.currentUser?.uid || "";
      const latitude = selectedCoordinates?.latitude ?? null;
      const longitude = selectedCoordinates?.longitude ?? null;

      await addDoc(collection(db, "blood-requests"), {
        patientName: patientName.trim(),
        bloodType: selectedBloodType,
        urgency: selectedUrgency,
        hospitalName: hospitalName.trim(),
        location: location || locationDisplay.trim(),
        latitude,
        longitude,
        contactPhone: normalizedPhone,
        unitsNeeded: units,
        additionalNotes: additionalNotes.trim(),
        status: "Pending",
        requestType: "BloodRequest",
        reporterUid: currentUid,
        reporterName:
          currentUserData?.fullName ||
          auth.currentUser?.displayName ||
          "A Hero",
        createdAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, "community_notifications"), {
          type: "request",
          title: `${selectedBloodType} Blood Required 🩸`,
          message: `${patientName.trim()} needs ${units} unit${units === 1 ? "" : "s"} of ${selectedBloodType} at ${hospitalName.trim()}.`,
          createdAt: serverTimestamp(),
          unread: true,
          icon: "water",
          color: "#DC2626",
          reporterUid: currentUid,
        });
      } catch (error) {
        console.error("Error creating community notification:", error);
      }

      // Expo push notifications are sent by the ASP.NET Core backend.
      // The mobile app only creates the blood request/community notification.

      Alert.alert(
        "Request Submitted",
        "Your blood request has been posted successfully. Nearby donors can now see it.",
        [{ text: "Done" }],
      );

      setPatientName("");
      setSelectedBloodType("");
      setSelectedUrgency("");
      setHospitalName("");
      setLocation("");
      setLocationDisplay("");
      setContactPhone("");
      setUnitsNeeded("");
      setAdditionalNotes("");
      setCurrentLocationData(null);
      setSelectedCoordinates(null);
      setShowBloodTypePicker(false);
    } catch (error: any) {
      console.error("backend database Error:", error);

      let message = "Unable to submit the blood request. Please try again.";

      if (error?.code === "permission-denied") {
        message = "You do not have permission to submit this request.";
      } else if (error?.code === "unavailable") {
        message = "Service unavailable. Please check your internet connection.";
      }

      Alert.alert("Submission Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-5">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[30px] font-black tracking-tight text-gray-950">
                  Request Blood
                </Text>
                <Text className="mt-1.5 text-[15px] font-medium leading-5 text-gray-500">
                  Help us find the right donor for your patient.
                </Text>
              </View>

              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                <Ionicons name="water" size={24} color="#DC2626" />
              </View>
            </View>

            {/* Small progress card */}
            <View className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5">
              <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark-outline" size={17} color="#DC2626" />
                  <Text className="ml-2 text-xs font-bold text-red-700">
                    Request details
                  </Text>
                </View>
                <Text className="text-xs font-black text-red-600">{formProgress}%</Text>
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-red-100">
                <View
                  className="h-full rounded-full bg-red-600"
                  style={{ width: `${Math.max(formProgress, 4)}%` }}
                />
              </View>
            </View>
          </View>

          {/* Form */}
          <View className="gap-5">
            {/* Patient Name */}
            <View>
              <Text className="mb-2 ml-1 text-xs font-extrabold tracking-wide text-gray-600">
                Patient name <Text className="text-red-600">*</Text>
              </Text>
              <View
                className={`min-h-[58px] flex-row items-center rounded-2xl border bg-white px-4 ${getInputBorderClass(!!patientName.trim())}`}
              >
                <Ionicons name="person-outline" size={20} color="#6B7280" />
                <TextInput
                  className="ml-3 flex-1 py-2 text-[15px] font-semibold text-gray-900"
                  placeholder="Enter patient's full name"
                  placeholderTextColor="#9CA3AF"
                  value={patientName}
                  onChangeText={setPatientName}
                  editable={!isLoading}
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Blood Type */}
            <View>
              <Text className="mb-2 ml-1 text-xs font-extrabold tracking-wide text-gray-600">
                Blood type required <Text className="text-red-600">*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => !isLoading && setShowBloodTypePicker(!showBloodTypePicker)}
                activeOpacity={0.8}
                className={`min-h-[58px] flex-row items-center border bg-white px-4 ${
                  showBloodTypePicker
                    ? "rounded-t-2xl border-gray-300 border-b-gray-100"
                    : "rounded-2xl border-gray-200"
                }`}
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                  <Ionicons name="water-outline" size={18} color="#DC2626" />
                </View>
                <Text
                  className={`ml-3 flex-1 text-[15px] font-semibold ${
                    selectedBloodType ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {selectedBloodType || "Select blood type"}
                </Text>
                <Ionicons
                  name={showBloodTypePicker ? "chevron-up" : "chevron-down"}
                  size={19}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {showBloodTypePicker && (
                <View className="rounded-b-2xl border border-t-0 border-gray-200 bg-white px-4 pb-4 pt-3">
                  <View className="flex-row flex-wrap gap-2.5">
                    {BloodTypes.map((type) => {
                      const selected = selectedBloodType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => {
                            setSelectedBloodType(type);
                            setShowBloodTypePicker(false);
                          }}
                          activeOpacity={0.8}
                          className={`h-11 w-[22.8%] items-center justify-center rounded-xl border ${
                            selected
                              ? "border-red-600 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <Text
                            className={`text-sm font-black ${
                              selected ? "text-red-600" : "text-gray-600"
                            }`}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Urgency */}
            <View>
              <View className="mb-2 flex-row items-center justify-between px-1">
                <Text className="text-xs font-extrabold tracking-wide text-gray-600">
                  Urgency level <Text className="text-red-600">*</Text>
                </Text>
                <Text className="text-[11px] font-medium text-gray-400">
                  How quickly is blood needed?
                </Text>
              </View>

              <View className="flex-row gap-2.5">
                {UrgencyLevels.map((level) => {
                  const selected = selectedUrgency === level;
                  const isCritical = level === "Critical";
                  const isUrgent = level === "Urgent";

                  return (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setSelectedUrgency(level)}
                      disabled={isLoading}
                      activeOpacity={0.8}
                      className={`min-h-[54px] flex-1 items-center justify-center rounded-2xl border ${
                        selected
                          ? isCritical
                            ? "border-red-600 bg-red-50"
                            : isUrgent
                              ? "border-orange-500 bg-orange-50"
                              : "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <Ionicons
                          name={
                            isCritical
                              ? "warning-outline"
                              : isUrgent
                                ? "alert-circle-outline"
                                : "time-outline"
                          }
                          size={16}
                          color={
                            selected
                              ? isCritical
                                ? "#DC2626"
                                : isUrgent
                                  ? "#EA580C"
                                  : "#2563EB"
                              : "#6B7280"
                          }
                        />
                        <Text
                          className={`ml-1.5 text-xs font-black ${
                            selected
                              ? isCritical
                                ? "text-red-600"
                                : isUrgent
                                  ? "text-orange-600"
                                  : "text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          {level}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Hospital */}
            <View>
              <Text className="mb-2 ml-1 text-xs font-extrabold tracking-wide text-gray-600">
                Hospital / medical center <Text className="text-red-600">*</Text>
              </Text>
              <View
                className={`min-h-[58px] flex-row items-center rounded-2xl border bg-white px-4 ${getInputBorderClass(!!hospitalName.trim())}`}
              >
                <Ionicons name="business-outline" size={20} color="#6B7280" />
                <TextInput
                  className="ml-3 flex-1 py-2 text-[15px] font-semibold text-gray-900"
                  placeholder="e.g. KTH Hospital"
                  placeholderTextColor="#9CA3AF"
                  value={hospitalName}
                  onChangeText={setHospitalName}
                  editable={!isLoading}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Location */}
            <View>
              <View className="mb-2 flex-row items-center justify-between px-1">
                <Text className="text-xs font-extrabold tracking-wide text-gray-600">
                  Location <Text className="text-red-600">*</Text>
                </Text>
                <Text className="text-[11px] font-medium text-gray-400">
                  Address or GPS
                </Text>
              </View>

              <View
                className={`min-h-[58px] flex-row items-center rounded-2xl border bg-white pl-4 pr-2 ${getInputBorderClass(!!locationDisplay.trim())}`}
              >
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <TextInput
                  className="ml-3 flex-1 py-2 text-[15px] font-semibold text-gray-900"
                  placeholder="e.g. Hayatabad, Peshawar"
                  placeholderTextColor="#9CA3AF"
                  value={locationDisplay}
                  onChangeText={handleLocationTextChange}
                  editable={!isLoading}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={handleOpenMapPicker}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  className="h-10 w-10 items-center justify-center rounded-xl bg-red-50"
                >
                  <Ionicons name="navigate-outline" size={20} color="#DC2626" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleOpenMapPicker}
                disabled={isLoading}
                activeOpacity={0.8}
                className="mt-2 flex-row items-center self-start px-1"
              >
                <Ionicons name="locate-outline" size={15} color="#DC2626" />
                <Text className="ml-1.5 text-xs font-bold text-red-600">
                  Use my current location
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contact Phone */}
            <View>
              <Text className="mb-2 ml-1 text-xs font-extrabold tracking-wide text-gray-600">
                Contact phone <Text className="text-red-600">*</Text>
              </Text>
              <View
                className={`min-h-[58px] flex-row items-center rounded-2xl border bg-white px-4 ${getInputBorderClass(!!contactPhone.trim())}`}
              >
                <Ionicons name="call-outline" size={20} color="#6B7280" />
                <TextInput
                  className="ml-3 flex-1 py-2 text-[15px] font-semibold text-gray-900"
                  placeholder="+92 3XX XXXXXXX"
                  placeholderTextColor="#9CA3AF"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                  maxLength={16}
                />
              </View>
              <Text className="mt-1.5 ml-1 text-[11px] font-medium text-gray-400">
                Example: +92 300 1234567
              </Text>
            </View>

            {/* Units */}
            <View>
              <Text className="mb-2 ml-1 text-xs font-extrabold tracking-wide text-gray-600">
                Units needed <Text className="text-red-600">*</Text>
              </Text>
              <View
                className={`min-h-[58px] flex-row items-center rounded-2xl border bg-white px-4 ${getInputBorderClass(!!unitsNeeded.trim())}`}
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                  <Ionicons name="water-outline" size={18} color="#DC2626" />
                </View>
                <TextInput
                  className="ml-3 flex-1 py-2 text-[15px] font-semibold text-gray-900"
                  placeholder="e.g. 2"
                  placeholderTextColor="#9CA3AF"
                  value={unitsNeeded}
                  onChangeText={(text) => setUnitsNeeded(text.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  editable={!isLoading}
                  maxLength={3}
                />
                <Text className="text-xs font-bold text-gray-400">units</Text>
              </View>
            </View>

            {/* Additional Notes */}
            <View>
              <View className="mb-2 flex-row items-center justify-between px-1">
                <Text className="text-xs font-extrabold tracking-wide text-gray-600">
                  Additional notes
                </Text>
                <Text className="text-[11px] font-medium text-gray-400">Optional</Text>
              </View>
              <View className="rounded-2xl border border-gray-200 bg-white px-4 py-2">
                <TextInput
                  className="min-h-[92px] text-[15px] font-semibold leading-5 text-gray-900"
                  placeholder="Add important details such as surgery, accident, or special requirements..."
                  placeholderTextColor="#9CA3AF"
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                  multiline
                  textAlignVertical="top"
                  editable={!isLoading}
                  maxLength={500}
                />
                <Text className="pb-1 text-right text-[10px] font-medium text-gray-400">
                  {additionalNotes.length}/500
                </Text>
              </View>
            </View>

            {/* Safety note */}
            <View className="flex-row items-start rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3.5">
              <Ionicons name="information-circle-outline" size={18} color="#B45309" />
              <Text className="ml-2 flex-1 text-xs font-medium leading-5 text-amber-800">
                Please make sure the hospital, contact number, and blood type are correct before submitting.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmitRequest}
              disabled={isLoading}
              activeOpacity={0.9}
              className={`overflow-hidden rounded-2xl bg-red-600 ${isLoading ? "opacity-70" : ""}`}
            >
              <View className="flex-row items-center justify-center py-4">
                {isLoading ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text className="ml-3 text-sm font-black uppercase tracking-wider text-white">
                      Submitting request...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="water" size={20} color="white" />
                    <Text className="ml-2 text-sm font-black uppercase tracking-wider text-white">
                      Submit Blood Request
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center justify-center px-4">
              <Ionicons name="lock-closed-outline" size={13} color="#9CA3AF" />
              <Text className="ml-1.5 text-center text-[10px] font-medium text-gray-400">
                Your request is shared with registered users and donors.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => !locationLoading && setShowLocationModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
          <View className="flex-1">
            <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4">
              <View>
                <Text className="text-xl font-black text-gray-950">Select location</Text>
                <Text className="mt-0.5 text-xs font-medium text-gray-400">
                  Use GPS or enter the address manually
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                disabled={locationLoading}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={21} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {locationLoading ? (
                <View className="items-center rounded-3xl border border-gray-100 bg-gray-50 px-6 py-16">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <ActivityIndicator size="large" color="#DC2626" />
                  </View>
                  <Text className="mt-5 text-base font-black text-gray-800">
                    Getting your location
                  </Text>
                  <Text className="mt-2 text-center text-xs font-medium leading-5 text-gray-400">
                    Please wait while we read your current GPS position.
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  {currentLocationData && (
                    <View className="rounded-3xl border border-green-100 bg-green-50 p-4">
                      <View className="flex-row items-start">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                          <Ionicons name="checkmark-circle" size={21} color="#16A34A" />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-xs font-black uppercase tracking-wider text-green-700">
                            GPS location found
                          </Text>
                          <Text className="mt-1.5 text-sm font-semibold leading-5 text-green-900">
                            {currentLocationData.address}
                          </Text>
                          <Text className="mt-1 text-[10px] font-medium text-green-700">
                            {currentLocationData.latitude.toFixed(5)}, {currentLocationData.longitude.toFixed(5)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View>
                    <Text className="mb-2 ml-1 text-xs font-extrabold tracking-wide text-gray-600">
                      Location address <Text className="text-red-600">*</Text>
                    </Text>
                    <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <TextInput
                        className="min-h-[90px] text-[15px] font-semibold leading-5 text-gray-900"
                        placeholder="Enter hospital area, street, city, or landmark"
                        placeholderTextColor="#9CA3AF"
                        value={manualLocationInput}
                        onChangeText={setManualLocationInput}
                        multiline
                        textAlignVertical="top"
                        editable={!locationLoading}
                      />
                    </View>
                  </View>

                  <View className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5">
                    <View className="flex-row items-start">
                      <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
                      <Text className="ml-2 flex-1 text-xs font-medium leading-5 text-blue-800">
                        GPS adds a Google Maps location link to the request. You can edit the displayed address before confirming.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View className="gap-2 border-t border-gray-100 bg-white px-5 py-4">
              <TouchableOpacity
                onPress={handleConfirmLocation}
                disabled={locationLoading}
                activeOpacity={0.9}
                className={`rounded-2xl bg-red-600 ${locationLoading ? "opacity-50" : ""}`}
              >
                <View className="flex-row items-center justify-center py-4">
                  <Ionicons name="checkmark-circle-outline" size={19} color="white" />
                  <Text className="ml-2 text-sm font-black uppercase tracking-wider text-white">
                    Confirm location
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                disabled={locationLoading}
                className="rounded-2xl border border-gray-200 bg-white py-4"
              >
                <Text className="text-center text-sm font-bold text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default BloodRequests;
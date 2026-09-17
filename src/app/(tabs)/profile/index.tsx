import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { signOut } from "@/src/lib/backendCompat";
import { doc, serverTimestamp, updateDoc } from "@/src/lib/backendCompat";
import React, { useCallback, useEffect, useState } from "react";
import Avatar from "../../../components/Avatar";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../config/backendConfig";

import { useUserStore } from "../../../store/userStore";
import { getFreshGpsLocation } from "../../../utils/locationService";

const SectionHeader = ({ title }: { title: string }) => (
  <Text className="mb-3 mt-5 px-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">
    {title}
  </Text>
);

const MenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
  color = "text-gray-900",
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="mx-4 mb-2 flex-row items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5"
  >
    <View className="flex-row items-center flex-1">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
        <Ionicons name={icon} size={22} color="#DC2626" />
      </View>
      <View className="ml-4 flex-1">
        <Text className={`text-base font-bold ${color}`}>{title}</Text>
        {subtitle && (
          <Text className="text-xs font-medium text-gray-400">{subtitle}</Text>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
  </TouchableOpacity>
);

const MenuSwitch = ({ icon, title, value, onValueChange }: any) => (
  <View className="mx-4 mb-2 flex-row items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5">
    <View className="flex-row items-center flex-1">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
        <Ionicons name={icon} size={22} color="#DC2626" />
      </View>
      <Text className="ml-4 flex-1 text-base font-bold text-gray-900">
        {title}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#E2E8F0", true: "#F8B4BB" }}
      thumbColor={value ? "#E63946" : "#F1F5F9"}
    />
  </View>
);

const Profile = () => {
  const { user: userData, loading, setUser } = useUserStore();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [availableToDonate, setAvailableToDonate] = useState(true);
  // True while we're capturing a fresh GPS fix after the donor
  // switches "Available to Donate" ON. Used only to block a second
  // tap mid-request — it never blocks the rest of the screen.
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBloodType, setEditBloodType] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

  useEffect(() => {
    if (userData && userData.availableToDonate !== undefined) {
      setAvailableToDonate(userData.availableToDonate);
    }
  }, [userData]);

  // ======================================================
  // KEEP AN AVAILABLE DONOR'S LOCATION FRESH
  //
  // Every time this donor opens the Profile tab (not just
  // when they flip the switch), we silently grab their
  // current GPS fix and save it — but ONLY while they are
  // marked available. Donors who are unavailable are already
  // excluded from every donor list, so there's no need to
  // spend a GPS call refreshing their location.
  //
  // This runs quietly in the background: no alert, no loading
  // spinner — if it fails (no permission, no signal) we just
  // keep whatever location was already saved.
  // ======================================================
  useFocusEffect(
    useCallback(() => {
      if (!availableToDonate) return;

      const refreshLocationInBackground = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const freshLocation = await getFreshGpsLocation();
        if (!freshLocation) return;

        try {
          const liveCity = await Location.reverseGeocodeAsync({
            latitude: freshLocation.latitude,
            longitude: freshLocation.longitude,
          });

          const cityName =
            liveCity?.[0]?.city ||
            liveCity?.[0]?.subregion ||
            liveCity?.[0]?.region ||
            userData?.location ||
            "Location unavailable";

          await updateDoc(doc(db, "users", user.uid), {
            latitude: freshLocation.latitude,
            longitude: freshLocation.longitude,
            location: cityName,
            locationUpdatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Background location refresh failed:", e);
        }
      };

      refreshLocationInBackground();
    }, [availableToDonate])
  );

  const handleUpdateProfile = async () => {
    // Pakistani phone regex
    const pakPhoneRegex = /^(?:\+92|0)3\d{9}$/;
    const nameRegex = /^[a-zA-Z ]{2,50}$/;
    const locationRegex = /^[a-zA-Z\s,.-]{2,100}$/;

    if (!editName.trim() || !editPhone.trim() || !editLocation.trim()) {
      Alert.alert("Error", "Please fill all fields correctly.");
      return;
    }

    if (!locationRegex.test(editLocation) || editLocation.length > 100) {
      alert(
        "Please enter a valid location with only alphabets and spaces and length must be less than 100",
      );
      return;
    }

    if (!nameRegex.test(editName) || editName.length > 50) {
      alert(
        "Please enter a valid name with only alphabets and spaces and length must be less than 50",
      );
      return;
    }
    if (!pakPhoneRegex.test(editPhone)) {
      Alert.alert(
        "Invalid Phone",
        "Enter valid Pakistani phone number (e.g. +923XXXXXXXXX or 03XXXXXXXXX)",
      );
      return;
    }

    setIsUpdating(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);

        let newLocation = editLocation.trim();
        let lat = userData?.latitude ?? null;
        let lng = userData?.longitude ?? null;

        try {
          const freshLocation = await getFreshGpsLocation();

          if (freshLocation) {
            lat = freshLocation.latitude;
            lng = freshLocation.longitude;

            const geoResult = await Location.reverseGeocodeAsync({
              latitude: freshLocation.latitude,
              longitude: freshLocation.longitude,
            });

            const cityName =
              geoResult?.[0]?.city ||
              geoResult?.[0]?.subregion ||
              geoResult?.[0]?.region ||
              newLocation;

            newLocation = cityName || newLocation;
          }
        } catch (error) {
          console.log("GPS refresh during profile update failed:", error);

          if (newLocation) {
            try {
              const geocodedLocation = await Location.geocodeAsync(newLocation);
              const matchedLocation = geocodedLocation?.[0];

              if (matchedLocation) {
                lat = matchedLocation.latitude;
                lng = matchedLocation.longitude;
              }
            } catch (geoError) {
              console.log("Manual profile location geocoding failed:", geoError);
            }
          }
        }

        await updateDoc(userRef, {
          fullName: editName,
          phoneNumber: editPhone,
          location: newLocation,
          latitude: lat,
          longitude: lng,
          bloodType: editBloodType,
        });

        setUser({
          ...userData,
          fullName: editName,
          phoneNumber: editPhone,
          location: newLocation,
          latitude: lat ?? undefined,
          longitude: lng ?? undefined,
          bloodType: editBloodType,
        } as any);

        Alert.alert("Success", "Profile updated successfully!");
        setIsEditModalVisible(false);
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = () => {
    setEditName(userData?.fullName || "");
    setEditPhone(userData?.phoneNumber || "");
    setEditLocation(userData?.location || "");
    setEditBloodType(userData?.bloodType || "O+");
    setIsEditModalVisible(true);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout from your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to log out. Please try again.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 105, 125) }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card Section */}
        <View className="items-center px-6 pb-4 pt-6">
          <View className="relative">
            <View className="h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm">
              <Avatar
                name={userData?.fullName}
                photoUrl={userData?.avatarUrl}
                size={104}
                shape="circle"
              />
            </View>
            {/* Blood Type Badge */}
            <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-sm">
              <Text className="text-xs font-black text-white">
                {userData?.bloodType || "O+"}
              </Text>
            </View>
          </View>

            <Text className="mt-3 text-[24px] font-bold text-slate-900">
            {userData?.fullName || "Donor User"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text className="ml-1 text-sm font-medium text-slate-500">
              {userData?.location || "Location not set"}
            </Text>
          </View>
        </View>

        {/* Settings Section */}
        <SectionHeader title="Account Settings" />
        <MenuSwitch
          icon="notifications-outline"
          title="Notifications"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <MenuSwitch
          icon="heart-outline"
          title="Available to Donate"
          value={availableToDonate}
          onValueChange={async (value: boolean) => {
            // Ignore a second tap while a request is already running,
            // so we never fire two updates on top of each other.
            if (updatingAvailability) return;

            const previousValue = availableToDonate;

            // Optimistic UI update — switch flips instantly,
            // we correct it below only if something goes wrong.
            setAvailableToDonate(value);
            setUpdatingAvailability(true);

            try {
              const user = auth.currentUser;
              if (!user) return;

              if (value) {
                // Donor just turned availability ON — capture a
                // fresh GPS fix so "Find Nearby Donors" distances
                // (shown to reporters) reflect where they are RIGHT NOW,
                // not wherever they last happened to open the app.
                const freshLocation = await getFreshGpsLocation();

                if (freshLocation) {
                  await updateDoc(doc(db, "users", user.uid), {
                    availableToDonate: true,
                    latitude: freshLocation.latitude,
                    longitude: freshLocation.longitude,
                    locationUpdatedAt: serverTimestamp(),
                  });

                  setUser({
                    ...userData,
                    availableToDonate: true,
                    latitude: freshLocation.latitude,
                    longitude: freshLocation.longitude,
                  } as any);
                } else {
                  // GPS unavailable (permission denied / signal issue).
                  // Don't block the donor from going available — just
                  // let them know distance may be based on an older location.
                  Alert.alert(
                    "Location Not Updated",
                    "We couldn't get your current location, so the distance shown to nearby requests may not be accurate. You're still marked as available."
                  );

                  await updateDoc(doc(db, "users", user.uid), {
                    availableToDonate: true,
                  });

                  setUser({ ...userData, availableToDonate: true } as any);
                }
              } else {
                // Turning availability OFF doesn't need a location update.
                await updateDoc(doc(db, "users", user.uid), {
                  availableToDonate: false,
                });

                setUser({ ...userData, availableToDonate: false } as any);
              }
            } catch (e) {
              console.error("Toggle error:", e);
              // Revert the switch since the update failed.
              setAvailableToDonate(previousValue);
              Alert.alert(
                "Error",
                "Could not update your availability. Please try again."
              );
            } finally {
              setUpdatingAvailability(false);
            }
          }}
        />
        <MenuItem
          icon="create-outline"
          title="Edit Profile Information"
          subtitle="Change your name, phone, etc."
          onPress={openEditModal}
        />

        {/* Information Section */}
        <SectionHeader title="App Information" />
        <MenuItem
          icon="information-circle-outline"
          title="About App"
          onPress={() => router.push("/(tabs)/profile/aboutapp")}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          onPress={() => router.push("/(tabs)/profile/privacypolicy")}
        />
        <View className="mx-4 mb-2 flex-row items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Ionicons name="git-branch-outline" size={22} color="#DC2626" />
            </View>
            <Text className="ml-4 text-base font-bold text-gray-900">
              Version Info
            </Text>
          </View>
          <Text className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
            1.0.0
          </Text>
        </View>

        {/* Logout Section */}
        <SectionHeader title="Actions" />
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-4 mb-2 flex-row items-center rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3.5"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          </View>
          <Text className="ml-4 text-base font-bold text-red-600">
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View className="flex-1">
          {/* Transparent Backdrop - Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsEditModalVisible(false)}
            className="absolute inset-0 bg-black/40"
          />

          <View className="flex-1 justify-end">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              className="w-full"
            >
              <View className="rounded-t-[32px] bg-white px-6 pb-4 pt-3 shadow-2xl">
                {/* Drag Handle Indicator */}
                <View className="h-1.5 w-12 bg-gray-200 self-center rounded-full mb-6" />

                {/* Modal Header */}
                <View className="flex-row items-center justify-between mb-4 px-1">
                  <View>
                    <Text className="text-2xl font-black text-gray-900">
                      Edit Profile
                    </Text>
                    <Text className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
                      Personal Details
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsEditModalVisible(false)}
                    className="h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-gray-50"
                  >
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  className="max-h-[60vh]"
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Name Input */}
                  <View className="mb-5">
                    <Text className="mb-2.5 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                      Full Name
                    </Text>
                    <View className="flex-row items-center rounded-2xl bg-gray-50 px-4  border border-gray-100">
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#DC2626"
                      />
                      <TextInput
                        className="ml-3 flex-1 text-base font-bold text-gray-900"
                        placeholder="Full Name"
                        placeholderTextColor="#9CA3AF"
                        value={editName}
                        onChangeText={setEditName}
                      />
                    </View>
                  </View>

                  {/* Phone Input */}
                  <View className="mb-5">
                    <Text className="mb-2.5 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                      Phone Number
                    </Text>
                    <View className="flex-row items-center rounded-2xl bg-gray-50 px-4  border border-gray-100">
                      <Ionicons name="call-outline" size={18} color="#DC2626" />
                      <TextInput
                        className="ml-3 flex-1 text-base font-bold text-gray-900"
                        placeholder="Phone Number"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={editPhone}
                        onChangeText={setEditPhone}
                      />
                    </View>
                  </View>

                  {/* Location Input */}
                  <View className="mb-6">
                    <Text className="mb-2.5 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                      Primary Location
                    </Text>
                    <View className="flex-row items-center rounded-2xl bg-gray-50 px-4  border border-gray-100">
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color="#DC2626"
                      />
                      <TextInput
                        className="ml-3 flex-1 text-base font-bold text-gray-900"
                        placeholder="e.g. Bannu, Pakistan"
                        placeholderTextColor="#9CA3AF"
                        value={editLocation}
                        onChangeText={setEditLocation}
                      />
                    </View>
                  </View>

                  {/* Blood Type Picker */}
                  <Text className="mb-4 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                    Your Blood Group
                  </Text>
                  <View className="flex-row flex-wrap justify-between gap-y-3 mb-10">
                    {bloodTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setEditBloodType(type)}
                        className={`h-12 w-[23%] items-center justify-center rounded-2xl border ${
                          editBloodType === type
                            ? "border-red-600 bg-red-50"
                            : "border-gray-50 bg-gray-50"
                        }`}
                      >
                        <Text
                          className={`text-sm font-black ${
                            editBloodType === type
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={handleUpdateProfile}
                    disabled={isUpdating}
                    activeOpacity={0.9}
                    className={`rounded-2xl bg-red-600 shadow-xl shadow-red-200 mb-6 ${
                      isUpdating ? "opacity-70" : ""
                    }`}
                  >
                    <View className="items-center py-5">
                      {isUpdating ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-lg font-black text-white uppercase tracking-widest">
                          Update Profile
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;

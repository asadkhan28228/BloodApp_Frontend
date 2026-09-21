import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  signOut,
  doc,
  serverTimestamp,
  updateDoc,
} from "@/src/lib/backendCompat";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

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

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { auth, db } from "../../../config/backendConfig";
import { useUserStore } from "../../../store/userStore";
import { getFreshGpsLocation } from "../../../utils/locationService";

/* =========================================================
   SECTION HEADER
========================================================= */

const SectionHeader = ({ title }: { title: string }) => (
  <Text className="mb-2 mt-5 px-5 text-[11px] font-black uppercase tracking-[2px] text-slate-500">
    {title}
  </Text>
);

/* =========================================================
   MENU ITEM
========================================================= */

const MenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
  rightText,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    className="mx-4 mb-2 flex-row items-center rounded-2xl border border-gray-100 bg-white px-4 py-3"
    style={{
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.035,
      shadowRadius: 5,
      elevation: 1,
    }}
  >
    {/* Icon */}
    <View className="h-9 w-9 items-center justify-center">
      <Ionicons
        name={icon}
        size={21}
        color="#E11D48"
      />
    </View>

    {/* Text */}
    <View className="ml-3 flex-1">
      <Text className="text-[15px] font-extrabold text-slate-900">
        {title}
      </Text>

      {subtitle ? (
        <Text
          numberOfLines={2}
          className="mt-0.5 text-[11px] font-medium leading-4 text-slate-400"
        >
          {subtitle}
        </Text>
      ) : null}
    </View>

    {/* Right */}
    {rightText ? (
      <Text className="text-[12px] font-extrabold text-red-600">
        {rightText}
      </Text>
    ) : (
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#CBD5E1"
      />
    )}
  </TouchableOpacity>
);

/* =========================================================
   MENU SWITCH
========================================================= */

const MenuSwitch = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: any) => (
  <View
    className="mx-4 mb-2 flex-row items-center rounded-2xl border border-gray-100 bg-white px-4 py-3"
    style={{
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.035,
      shadowRadius: 5,
      elevation: 1,
    }}
  >
    {/* Icon */}
    <View className="h-9 w-9 items-center justify-center">
      <Ionicons
        name={icon}
        size={21}
        color="#E11D48"
      />
    </View>

    {/* Text */}
    <View className="ml-3 flex-1">
      <Text className="text-[15px] font-extrabold text-slate-900">
        {title}
      </Text>

      {subtitle ? (
        <Text className="mt-0.5 text-[11px] font-medium text-slate-400">
          {subtitle}
        </Text>
      ) : null}
    </View>

    {/* Switch */}
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: "#E2E8F0",
        true: "#FDA4AF",
      }}
      thumbColor={value ? "#E11D48" : "#F8FAFC"}
    />
  </View>
);

/* =========================================================
   PROFILE SCREEN
========================================================= */

const Profile = () => {
  const {
    user: userData,
    loading,
    setUser,
  } = useUserStore();

  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [availableToDonate, setAvailableToDonate] =
    useState(true);

  const [
    updatingAvailability,
    setUpdatingAvailability,
  ] = useState(false);

  /* =======================================================
     EDIT PROFILE STATE
  ======================================================= */

  const [
    isEditModalVisible,
    setIsEditModalVisible,
  ] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBloodType, setEditBloodType] = useState("");

  const [isUpdating, setIsUpdating] =
    useState(false);

  const bloodTypes = [
    "A+",
    "A-",
    "B+",
    "B-",
    "O+",
    "O-",
    "AB+",
    "AB-",
  ];

  /* =======================================================
     SYNC AVAILABILITY
  ======================================================= */

  useEffect(() => {
    if (
      userData &&
      userData.availableToDonate !== undefined
    ) {
      setAvailableToDonate(
        userData.availableToDonate,
      );
    }
  }, [userData]);

  /* =======================================================
     REFRESH AVAILABLE DONOR LOCATION
  ======================================================= */

  useFocusEffect(
    useCallback(() => {
      if (!availableToDonate) return;

      const refreshLocationInBackground =
        async () => {
          const user = auth.currentUser;

          if (!user) return;

          const freshLocation =
            await getFreshGpsLocation();

          if (!freshLocation) return;

          try {
            const liveCity =
              await Location.reverseGeocodeAsync({
                latitude:
                  freshLocation.latitude,
                longitude:
                  freshLocation.longitude,
              });

            const cityName =
              liveCity?.[0]?.city ||
              liveCity?.[0]?.subregion ||
              liveCity?.[0]?.region ||
              userData?.location ||
              "Location unavailable";

            await updateDoc(
              doc(db, "users", user.uid),
              {
                latitude:
                  freshLocation.latitude,
                longitude:
                  freshLocation.longitude,
                location: cityName,
                locationUpdatedAt:
                  serverTimestamp(),
              },
            );
          } catch (e) {
            console.error(
              "Background location refresh failed:",
              e,
            );
          }
        };

      refreshLocationInBackground();
    }, [availableToDonate]),
  );

  /* =======================================================
     OPEN EDIT PROFILE
  ======================================================= */

  const openEditModal = () => {
    setEditName(
      userData?.fullName || "",
    );

    setEditPhone(
      userData?.phoneNumber || "",
    );

    setEditLocation(
      userData?.location || "",
    );

    setEditBloodType(
      userData?.bloodType || "O+",
    );

    setIsEditModalVisible(true);
  };

  /* =======================================================
     UPDATE PROFILE
  ======================================================= */

  const handleUpdateProfile = async () => {
    const pakPhoneRegex =
      /^(?:\+92|0)3\d{9}$/;

    const nameRegex =
      /^[a-zA-Z ]{2,50}$/;

    const locationRegex =
      /^[a-zA-Z\s,.-]{2,100}$/;

    if (
      !editName.trim() ||
      !editPhone.trim() ||
      !editLocation.trim()
    ) {
      Alert.alert(
        "Error",
        "Please fill all fields correctly.",
      );

      return;
    }

    if (
      !locationRegex.test(editLocation) ||
      editLocation.length > 100
    ) {
      Alert.alert(
        "Invalid Location",
        "Please enter a valid location with only alphabets and spaces and length must be less than 100",
      );

      return;
    }

    if (
      !nameRegex.test(editName) ||
      editName.length > 50
    ) {
      Alert.alert(
        "Invalid Name",
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
        const userRef = doc(
          db,
          "users",
          user.uid,
        );

        let newLocation =
          editLocation.trim();

        let lat =
          userData?.latitude ?? null;

        let lng =
          userData?.longitude ?? null;

        try {
          const freshLocation =
            await getFreshGpsLocation();

          if (freshLocation) {
            lat =
              freshLocation.latitude;

            lng =
              freshLocation.longitude;

            const geoResult =
              await Location.reverseGeocodeAsync(
                {
                  latitude:
                    freshLocation.latitude,
                  longitude:
                    freshLocation.longitude,
                },
              );

            const cityName =
              geoResult?.[0]?.city ||
              geoResult?.[0]?.subregion ||
              geoResult?.[0]?.region ||
              newLocation;

            newLocation =
              cityName || newLocation;
          }
        } catch (error) {
          console.log(
            "GPS refresh during profile update failed:",
            error,
          );

          if (newLocation) {
            try {
              const geocodedLocation =
                await Location.geocodeAsync(
                  newLocation,
                );

              const matchedLocation =
                geocodedLocation?.[0];

              if (matchedLocation) {
                lat =
                  matchedLocation.latitude;

                lng =
                  matchedLocation.longitude;
              }
            } catch (geoError) {
              console.log(
                "Manual profile location geocoding failed:",
                geoError,
              );
            }
          }
        }

        await updateDoc(
          userRef,
          {
            fullName: editName,
            phoneNumber: editPhone,
            location: newLocation,
            latitude: lat,
            longitude: lng,
            bloodType: editBloodType,
          },
        );

        setUser({
          ...userData,
          fullName: editName,
          phoneNumber: editPhone,
          location: newLocation,
          latitude:
            lat ?? undefined,
          longitude:
            lng ?? undefined,
          bloodType: editBloodType,
        } as any);

        Alert.alert(
          "Success",
          "Profile updated successfully!",
        );

        setIsEditModalVisible(false);
      }
    } catch (error) {
      console.error(
        "Update error:",
        error,
      );

      Alert.alert(
        "Error",
        "Failed to update profile.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout from your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",

          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error(
                "Logout error:",
                error,
              );

              Alert.alert(
                "Error",
                "Failed to log out. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />
      </View>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      edges={["top"]}
    >
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: Math.max(
            insets.bottom + 105,
            125,
          ),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <View className="px-5 pb-3 pt-4">

          <View className="flex-row items-center">

            {/* Avatar */}

            <View className="relative">
              <View className="h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full bg-slate-100">
                <Avatar
                  name={userData?.fullName}
                  photoUrl={userData?.avatarUrl}
                  size={92}
                  shape="circle"
                />
              </View>

              {/* Blood Badge */}

              <View className="absolute -bottom-1 -right-1 h-9 min-w-9 items-center justify-center rounded-full border-[3px] border-slate-50 bg-red-600 px-1">
                <Text className="text-[10px] font-black text-white">
                  {userData?.bloodType ||
                    "O+"}
                </Text>
              </View>
            </View>

            {/* User Details */}

            <View className="ml-5 flex-1">

              <View className="flex-row items-center">
                <Text
                  numberOfLines={1}
                  className="flex-1 text-[22px] font-black text-slate-900"
                >
                  {userData?.fullName ||
                    "Donor User"}
                </Text>

                <TouchableOpacity
                  onPress={openEditModal}
                  activeOpacity={0.7}
                  className="ml-2 h-9 w-9 items-center justify-center"
                >
                  <Ionicons
                    name="create-outline"
                    size={21}
                    color="#E11D48"
                  />
                </TouchableOpacity>
              </View>

              {/* Location */}

              <View className="mt-1 flex-row items-center">
                <Ionicons
                  name="location-outline"
                  size={15}
                  color="#64748B"
                />

                <Text
                  numberOfLines={1}
                  className="ml-1 flex-1 text-[12px] font-medium text-slate-500"
                >
                  {userData?.location ||
                    "Location not set"}
                </Text>
              </View>

              {/* Ready Status */}

              <View className="mt-3 flex-row items-center">
                <View
                  className={`h-2 w-2 rounded-full ${
                    availableToDonate
                      ? "bg-red-500"
                      : "bg-slate-400"
                  }`}
                />

                <Text
                  className={`ml-2 text-[11px] font-extrabold ${
                    availableToDonate
                      ? "text-red-600"
                      : "text-slate-400"
                  }`}
                >
                  {availableToDonate
                    ? "Ready to Donate"
                    : "Not Available"}
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              PROFILE STATS
          ================================================= */}

          <View className="mt-6 flex-row items-center justify-around">

            {/* Blood Type */}

            <View className="flex-1 items-center">
              <Ionicons
                name="water"
                size={22}
                color="#E11D48"
              />

              <Text className="mt-1 text-[14px] font-black text-slate-900">
                {userData?.bloodType ||
                  "O+"}
              </Text>

              <Text className="text-[10px] font-medium text-slate-400">
                Blood Type
              </Text>
            </View>

            {/* Ready */}

            <View className="flex-1 items-center">
              <Ionicons
                name="heart"
                size={22}
                color="#E11D48"
              />

              <Text className="mt-1 text-[14px] font-black text-slate-900">
                {availableToDonate
                  ? "Ready"
                  : "Off"}
              </Text>

              <Text className="text-[10px] font-medium text-slate-400">
                To Donate
              </Text>
            </View>

            {/* Account */}

            <View className="flex-1 items-center">
              <Ionicons
                name="shield-checkmark"
                size={22}
                color="#E11D48"
              />

              <Text className="mt-1 text-[14px] font-black text-slate-900">
                {userData?.isActive ===
                false
                  ? "Inactive"
                  : "Active"}
              </Text>

              <Text className="text-[10px] font-medium text-slate-400">
                Account
              </Text>
            </View>
          </View>
        </View>

        {/* =================================================
            ACCOUNT SETTINGS
        ================================================= */}

        <SectionHeader title="Account Settings" />

        <MenuSwitch
          icon="notifications-outline"
          title="Notifications"
          subtitle="Receive updates and important alerts"
          value={notificationsEnabled}
          onValueChange={
            setNotificationsEnabled
          }
        />

        <MenuSwitch
          icon="heart-outline"
          title="Available to Donate"
          subtitle="Show your availability to people nearby"
          value={availableToDonate}
          disabled={updatingAvailability}
          onValueChange={async (
            value: boolean,
          ) => {
            if (updatingAvailability)
              return;

            const previousValue =
              availableToDonate;

            setAvailableToDonate(value);

            setUpdatingAvailability(
              true,
            );

            try {
              const user =
                auth.currentUser;

              if (!user) {
                setAvailableToDonate(
                  previousValue,
                );

                return;
              }

              /* Availability ON */

              if (value) {
                const freshLocation =
                  await getFreshGpsLocation();

                if (freshLocation) {
                  await updateDoc(
                    doc(
                      db,
                      "users",
                      user.uid,
                    ),
                    {
                      availableToDonate:
                        true,

                      latitude:
                        freshLocation.latitude,

                      longitude:
                        freshLocation.longitude,

                      locationUpdatedAt:
                        serverTimestamp(),
                    },
                  );

                  setUser({
                    ...userData,

                    availableToDonate:
                      true,

                    latitude:
                      freshLocation.latitude,

                    longitude:
                      freshLocation.longitude,
                  } as any);
                } else {
                  Alert.alert(
                    "Location Not Updated",
                    "We couldn't get your current location, so the distance shown to nearby requests may not be accurate. You're still marked as available.",
                  );

                  await updateDoc(
                    doc(
                      db,
                      "users",
                      user.uid,
                    ),
                    {
                      availableToDonate:
                        true,
                    },
                  );

                  setUser({
                    ...userData,
                    availableToDonate:
                      true,
                  } as any);
                }
              }

              /* Availability OFF */

              else {
                await updateDoc(
                  doc(
                    db,
                    "users",
                    user.uid,
                  ),
                  {
                    availableToDonate:
                      false,
                  },
                );

                setUser({
                  ...userData,
                  availableToDonate:
                    false,
                } as any);
              }
            } catch (e) {
              console.error(
                "Toggle error:",
                e,
              );

              setAvailableToDonate(
                previousValue,
              );

              Alert.alert(
                "Error",
                "Could not update your availability. Please try again.",
              );
            } finally {
              setUpdatingAvailability(
                false,
              );
            }
          }}
        />

        <MenuItem
          icon="create-outline"
          title="Edit Profile Information"
          subtitle="Change your name, phone, location and blood group"
          onPress={openEditModal}
        />

        {/* =================================================
            APP INFORMATION
        ================================================= */}

        <SectionHeader title="App Information" />

        <MenuItem
          icon="information-circle-outline"
          title="About App"
          subtitle="Learn more about BloodCare"
          onPress={() =>
            router.push(
              "/(tabs)/profile/aboutapp",
            )
          }
        />

        <MenuItem
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          subtitle="Read our privacy policy"
          onPress={() =>
            router.push(
              "/(tabs)/profile/privacypolicy",
            )
          }
        />

        <MenuItem
          icon="git-branch-outline"
          title="Version Info"
          subtitle="Current app version"
          rightText="1.0.0"
        />

        {/* =================================================
            LOGOUT
        ================================================= */}

        <SectionHeader title="Actions" />

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="mx-4 mb-2 flex-row items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-3"
        >
          <View className="h-9 w-9 items-center justify-center">
            <Ionicons
              name="log-out-outline"
              size={21}
              color="#DC2626"
            />
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-extrabold text-red-600">
              Logout
            </Text>

            <Text className="mt-0.5 text-[11px] font-medium text-red-400">
              Sign out from your account
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color="#FCA5A5"
          />
        </TouchableOpacity>
      </ScrollView>

      {/* =================================================
          EDIT PROFILE MODAL
      ================================================= */}

      <Modal
        visible={isEditModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() =>
          setIsEditModalVisible(false)
        }
      >
        <View className="flex-1">

          {/* Backdrop */}

          <TouchableOpacity
            activeOpacity={1}
            onPress={() =>
              setIsEditModalVisible(false)
            }
            className="absolute inset-0 bg-black/40"
          />

          <View className="flex-1 justify-end">
            <KeyboardAvoidingView
              behavior={
                Platform.OS === "ios"
                  ? "padding"
                  : undefined
              }
              className="w-full"
            >
              <View className="rounded-t-[32px] bg-white px-6 pb-4 pt-3 shadow-2xl">

                {/* Drag Handle */}

                <View className="mb-6 h-1.5 w-12 self-center rounded-full bg-gray-200" />

                {/* Header */}

                <View className="mb-4 flex-row items-center justify-between px-1">
                  <View>
                    <Text className="text-2xl font-black text-gray-900">
                      Edit Profile
                    </Text>

                    <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                      Personal Details
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setIsEditModalVisible(
                        false,
                      )
                    }
                    className="h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-gray-50"
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                  className="max-h-[60vh]"
                  keyboardShouldPersistTaps="handled"
                >

                  {/* FULL NAME */}

                  <View className="mb-5">
                    <Text className="mb-2.5 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                      Full Name
                    </Text>

                    <View className="flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4">
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#DC2626"
                      />

                      <TextInput
                        className="ml-3 flex-1 py-4 text-base font-bold text-gray-900"
                        placeholder="Full Name"
                        placeholderTextColor="#9CA3AF"
                        value={editName}
                        onChangeText={
                          setEditName
                        }
                      />
                    </View>
                  </View>

                  {/* PHONE */}

                  <View className="mb-5">
                    <Text className="mb-2.5 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                      Phone Number
                    </Text>

                    <View className="flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4">
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color="#DC2626"
                      />

                      <TextInput
                        className="ml-3 flex-1 py-4 text-base font-bold text-gray-900"
                        placeholder="Phone Number"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={editPhone}
                        onChangeText={
                          setEditPhone
                        }
                      />
                    </View>
                  </View>

                  {/* LOCATION */}

                  <View className="mb-6">
                    <Text className="mb-2.5 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                      Primary Location
                    </Text>

                    <View className="flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4">
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color="#DC2626"
                      />

                      <TextInput
                        className="ml-3 flex-1 py-4 text-base font-bold text-gray-900"
                        placeholder="e.g. Bannu, Pakistan"
                        placeholderTextColor="#9CA3AF"
                        value={editLocation}
                        onChangeText={
                          setEditLocation
                        }
                      />
                    </View>
                  </View>

                  {/* BLOOD TYPE */}

                  <Text className="mb-4 ml-1 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                    Your Blood Group
                  </Text>

                  <View className="mb-10 flex-row flex-wrap justify-between gap-y-3">
                    {bloodTypes.map(
                      (type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() =>
                            setEditBloodType(
                              type,
                            )
                          }
                          className={`h-12 w-[23%] items-center justify-center rounded-2xl border ${
                            editBloodType ===
                            type
                              ? "border-red-600 bg-red-50"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          <Text
                            className={`text-sm font-black ${
                              editBloodType ===
                              type
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>

                  {/* UPDATE BUTTON */}

                  <TouchableOpacity
                    onPress={
                      handleUpdateProfile
                    }
                    disabled={isUpdating}
                    activeOpacity={0.9}
                    className={`mb-6 rounded-2xl bg-red-600 ${
                      isUpdating
                        ? "opacity-70"
                        : ""
                    }`}
                    style={{
                      shadowColor:
                        "#DC2626",
                      shadowOffset: {
                        width: 0,
                        height: 5,
                      },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                  >
                    <View className="items-center py-4">
                      {isUpdating ? (
                        <ActivityIndicator
                          color="white"
                          size="small"
                        />
                      ) : (
                        <Text className="text-[15px] font-black uppercase tracking-widest text-white">
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
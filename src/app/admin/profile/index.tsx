import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signOut } from "@/src/lib/backendCompat";
import { auth } from "../../../config/backendConfig";
import { useUserStore } from "../../../store/userStore";

// ======================================================
// ADMIN PROFILE
// admin           -> Main Admin profile
// bloodBankAdmin  -> Blood Bank Admin profile
// ======================================================

const AdminProfile = () => {
  const router = useRouter();

  const { user, clearUser } = useUserStore();

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
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
              clearUser();

              await signOut(auth);

              router.replace("/(auth)" as any);
            } catch (error) {
              console.error(
                "Admin logout error:",
                error
              );

              Alert.alert(
                "Error",
                "Could not logout."
              );
            }
          },
        },
      ]
    );
  };

  // ====================================================
  // BLOOD BANK ADMIN PROFILE
  // ====================================================

  if (user?.role === "bloodBankAdmin") {
    return (
      <BloodBankAdminProfile
        user={user}
        onLogout={handleLogout}
        onBack={() =>
          router.replace("/admin/inventory/management" as any)
        }
      />
    );
  }

  // ====================================================
  // MAIN ADMIN PROFILE
  // Existing Main Admin UI
  // ====================================================

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top"]}
    >
      {/* HEADER */}

      <View className="flex-row items-center border-b border-gray-100 px-5 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#111827"
          />
        </TouchableOpacity>

        <View className="ml-4">
          <Text className="text-2xl font-black text-gray-900">
            Admin Profile
          </Text>

          <Text className="text-xs font-semibold text-gray-400">
            Account information
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        <View className="px-6 pt-8">
          {/* AVATAR */}

          <View className="items-center">
            <View className="h-28 w-28 items-center justify-center rounded-full bg-red-50">
              <Ionicons
                name="shield-checkmark"
                size={55}
                color="#DC2626"
              />
            </View>

            <Text className="mt-5 text-2xl font-black text-gray-900">
              {user?.fullName ||
                "System Admin"}
            </Text>

            <View className="mt-2 rounded-full bg-red-50 px-4 py-2">
              <Text className="text-xs font-black uppercase tracking-wider text-red-600">
                Administrator
              </Text>
            </View>
          </View>

          {/* INFORMATION */}

          <View className="mt-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <ProfileItem
              icon="person-outline"
              label="Full Name"
              value={
                user?.fullName ||
                "System Admin"
              }
            />

            <ProfileItem
              icon="mail-outline"
              label="Email"
              value={
                user?.email ||
                "admin@bloodcare.com"
              }
            />

            <ProfileItem
              icon="shield-checkmark-outline"
              label="Role"
              value="Admin"
            />

            <ProfileItem
              icon="checkmark-circle-outline"
              label="Account Status"
              value={
                user?.isActive === false
                  ? "Disabled"
                  : "Active"
              }
              last
            />
          </View>

          {/* SECURITY */}

          <Text className="mt-8 text-sm font-black uppercase tracking-widest text-gray-400">
            Security
          </Text>

          <View className="mt-3 rounded-3xl border border-gray-100 bg-white">
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.85}
              className="flex-row items-center px-5 py-5"
            >
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color="#DC2626"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="font-black text-gray-900">
                  Logout
                </Text>

                <Text className="mt-1 text-xs font-semibold text-gray-400">
                  Sign out from admin panel
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ======================================================
// BLOOD BANK ADMIN PROFILE
// Screenshot style UI
// ======================================================

const BloodBankAdminProfile = ({
  user,
  onLogout,
  onBack,
}: {
  user: any;
  onLogout: () => void;
  onBack: () => void;
}) => {
  const fullName =
    user?.fullName?.trim() ||
    "Blood Bank Admin";

  const email =
    user?.email?.trim() ||
    "Not provided";

  const phone =
    user?.phoneNumber?.trim() ||
    "Not provided";

  const location =
    user?.location?.trim() ||
    "Not provided";

  const accountStatus =
    user?.isActive === false
      ? "Inactive"
      : "Active";

  const initials =
    getInitials(fullName);

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FC]"
      edges={["top"]}
    >
      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <View className="flex-row items-center px-5 pb-4 pt-2">
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.8}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-white"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>

        <View className="ml-3 flex-1">
          <Text className="text-[22px] font-black text-gray-900">
            Admin Profile
          </Text>

          <Text className="mt-0.5 text-[11px] font-semibold text-gray-400">
            Blood bank account & access
          </Text>
        </View>

        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
          <Ionicons
            name="shield-checkmark"
            size={21}
            color="#DC2626"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 35,
        }}
      >
        {/* =========================================== */}
        {/* RED PROFILE CARD */}
        {/* =========================================== */}

        <View className="mx-5 mt-2 overflow-hidden rounded-[32px] bg-red-600 px-5 pb-7 pt-7">
          {/* decorative circles */}

          <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/5" />

          <View className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-red-500/40" />

          <View className="items-center">
            {/* AVATAR */}

            <View className="h-[118px] w-[118px] items-center justify-center rounded-full border-[7px] border-white bg-green-50">
              <Text className="text-[38px] font-black text-green-600">
                {initials}
              </Text>
            </View>

            {/* NAME */}

            <Text
              numberOfLines={1}
              className="mt-5 max-w-[300px] text-center text-[27px] font-black text-white"
            >
              {fullName}
            </Text>

            {/* EMAIL */}

            <Text
              numberOfLines={1}
              className="mt-1 max-w-[290px] text-center text-[13px] font-semibold text-red-50"
            >
              {email}
            </Text>

            {/* ROLE BADGE */}

            <View className="mt-5 flex-row items-center rounded-full border border-white/30 bg-white/10 px-4 py-2">
              <Ionicons
                name="business"
                size={14}
                color="#FFFFFF"
              />

              <Text className="ml-2 text-[10px] font-black uppercase tracking-[1.5px] text-white">
                Blood Bank Admin
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================== */}
        {/* STATUS CARDS */}
        {/* =========================================== */}

        <View className="mx-5 mt-5 flex-row">
          {/* ACCOUNT */}

          <View className="mr-2 flex-1 rounded-[25px] border border-green-100 bg-green-50 p-5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name={
                  user?.isActive === false
                    ? "close-circle"
                    : "checkmark-circle"
                }
                size={23}
                color={
                  user?.isActive === false
                    ? "#DC2626"
                    : "#10B981"
                }
              />
            </View>

            <Text className="mt-5 text-[10px] font-black uppercase tracking-wider text-green-600">
              Account
            </Text>

            <Text className="mt-1 text-[18px] font-black text-gray-800">
              {accountStatus}
            </Text>
          </View>

          {/* ACCESS */}

          <View className="ml-2 flex-1 rounded-[25px] border border-red-100 bg-red-50 p-5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="key"
                size={21}
                color="#DC2626"
              />
            </View>

            <Text className="mt-5 text-[10px] font-black uppercase tracking-wider text-red-500">
              Access
            </Text>

            <Text className="mt-1 text-[18px] font-black text-gray-800">
              Blood Bank
            </Text>
          </View>
        </View>

        {/* =========================================== */}
        {/* ACCOUNT INFORMATION */}
        {/* =========================================== */}

        <SectionTitle title="ACCOUNT INFORMATION" />

        <View className="mx-5 overflow-hidden rounded-[27px] border border-gray-100 bg-white px-5 shadow-sm">
          <ProfileInfoRow
            icon="person-outline"
            label="FULL NAME"
            value={fullName}
          />

          <ProfileInfoRow
            icon="mail-outline"
            label="EMAIL ADDRESS"
            value={email}
          />

          <ProfileInfoRow
            icon="call-outline"
            label="PHONE NUMBER"
            value={phone}
          />

          <ProfileInfoRow
            icon="location-outline"
            label="LOCATION"
            value={location}
          />

          <ProfileInfoRow
            icon="shield-outline"
            label="ACCOUNT ROLE"
            value="Blood Bank Admin"
            last
          />
        </View>

        {/* =========================================== */}
        {/* ADMIN PERMISSIONS */}
        {/* =========================================== */}

        <SectionTitle title="ADMIN PERMISSIONS" />

        <View className="mx-5 overflow-hidden rounded-[27px] border border-gray-100 bg-white px-5 shadow-sm">
          <PermissionRow
            icon="water-outline"
            title="Manage Blood Stock"
          />

          <PermissionRow
            icon="time-outline"
            title="Manage Blood Expiry"
          />

          <PermissionRow
            icon="call-outline"
            title="Manage Blood Bank Contact"
            last
          />
        </View>

        {/* =========================================== */}
        {/* LOGOUT */}
        {/* =========================================== */}

        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.85}
          className="mx-5 mt-7 flex-row items-center rounded-[25px] border border-red-100 bg-red-50 px-5 py-5"
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name="log-out-outline"
              size={23}
              color="#DC2626"
            />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-[16px] font-black text-red-600">
              Logout
            </Text>

            <Text className="mt-1 text-[11px] font-medium text-red-400">
              Sign out from Blood Bank Admin
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={23}
            color="#DC2626"
          />
        </TouchableOpacity>

        {/* FOOTER */}

        <Text className="mb-4 mt-7 text-center text-[9px] font-black uppercase tracking-[2px] text-gray-300">
          BLOODCARE • SECURE ADMIN ACCESS
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ======================================================
// MAIN ADMIN PROFILE ITEM
// ======================================================

const ProfileItem = ({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) => {
  return (
    <View
      className={`flex-row items-center py-4 ${
        !last
          ? "border-b border-gray-100"
          : ""
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
        <Ionicons
          name={icon}
          size={19}
          color="#6B7280"
        />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-[10px] font-black uppercase tracking-wider text-gray-400">
          {label}
        </Text>

        <Text className="mt-1 text-sm font-bold text-gray-800">
          {value}
        </Text>
      </View>
    </View>
  );
};

// ======================================================
// SECTION TITLE
// ======================================================

const SectionTitle = ({
  title,
}: {
  title: string;
}) => {
  return (
    <Text className="mx-6 mb-3 mt-7 text-[11px] font-black tracking-[2px] text-gray-400">
      {title}
    </Text>
  );
};

// ======================================================
// BLOOD BANK PROFILE INFORMATION ROW
// ======================================================

const ProfileInfoRow = ({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) => {
  return (
    <View
      className={`flex-row items-center py-4 ${
        !last
          ? "border-b border-gray-100"
          : ""
      }`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
        <Ionicons
          name={icon}
          size={21}
          color="#DC2626"
        />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-[9px] font-black tracking-[1.3px] text-gray-400">
          {label}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-1 text-[14px] font-bold leading-5 text-gray-700"
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

// ======================================================
// PERMISSION ROW
// ======================================================

const PermissionRow = ({
  icon,
  title,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  last?: boolean;
}) => {
  return (
    <View
      className={`flex-row items-center py-4 ${
        !last
          ? "border-b border-gray-100"
          : ""
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-50">
        <Ionicons
          name={icon}
          size={19}
          color="#DC2626"
        />
      </View>

      <Text className="ml-4 flex-1 text-[13px] font-bold text-gray-700">
        {title}
      </Text>

      <Ionicons
        name="checkmark-circle"
        size={21}
        color="#10B981"
      />
    </View>
  );
};

// ======================================================
// INITIALS
// ======================================================

const getInitials = (
  fullName?: string
) => {
  if (!fullName?.trim()) {
    return "BB";
  }

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
};

export default AdminProfile;
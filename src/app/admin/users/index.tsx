import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "@/src/lib/backendCompat";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "../../../config/backendConfig";

interface AppUser {
  id: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  bloodType?: string;
  location?: string;
  role?: string;
  isActive?: boolean;
  availableToDonate?: boolean;
}

const ManageUsers = () => {
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "users")
      );

      const userList: AppUser[] = [];

      snapshot.forEach((userDoc) => {
        const data = userDoc.data();

        // Full admins ko users list mein show nahi karna.
        // Blood Bank Admin ko list mein rakho taake access remove ho sake.
        if (data.role !== "admin") {
          userList.push({
            id: userDoc.id,
            ...data,
          });
        }
      });

      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);

      Alert.alert(
        "Error",
        "Could not load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.fullName
          ?.toLowerCase()
          .includes(keyword) ||
        user.email
          ?.toLowerCase()
          .includes(keyword) ||
        user.bloodType
          ?.toLowerCase()
          .includes(keyword) ||
        user.location
          ?.toLowerCase()
          .includes(keyword)
      );
    });
  }, [search, users]);

  const toggleUserStatus = async (
    user: AppUser
  ) => {
    try {
      const newStatus =
        user.isActive === false;

      await updateDoc(
        doc(db, "users", user.id),
        {
          isActive: newStatus,
        }
      );

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isActive: newStatus,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Error updating user status:",
        error
      );

      Alert.alert(
        "Error",
        "Could not update user status."
      );
    }
  };

  const toggleBloodBankRole = async (
    user: AppUser
  ) => {
    const nextRole =
      user.role === "bloodBankAdmin"
        ? "user"
        : "bloodBankAdmin";

    try {
      await updateDoc(
        doc(db, "users", user.id),
        { role: nextRole }
      );

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? { ...item, role: nextRole }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Error updating user role:",
        error
      );

      Alert.alert(
        "Error",
        "Could not update user role."
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />

        <Text className="mt-4 font-semibold text-gray-400">
          Loading Users...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top"]}
    >
      {/* Header */}

      <View className="flex-row items-center border-b border-gray-100 px-5 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
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
            Manage Users
          </Text>

          <Text className="text-xs font-semibold text-gray-400">
            View and manage registered users
          </Text>
        </View>
      </View>

      {/* Search */}

      <View className="px-5 pt-5">
        <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4">
          <Ionicons
            name="search-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor="#9CA3AF"
            className="ml-3 flex-1 py-4 font-semibold text-gray-900"
          />
        </View>
      </View>

      {/* User Count */}

      <View className="px-5 py-4">
        <Text className="text-sm font-bold text-gray-400">
          {filteredUsers.length} User
          {filteredUsers.length !== 1
            ? "s"
            : ""}
        </Text>
      </View>

      {/* Users List */}

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Ionicons
              name="people-outline"
              size={55}
              color="#D1D5DB"
            />

            <Text className="mt-4 font-bold text-gray-400">
              No users found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive =
            item.isActive !== false;

          return (
            <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              {/* User Basic Info */}

              <View className="flex-row items-center">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                  <Text className="text-xl font-black text-red-600">
                    {item.fullName
                      ? item.fullName
                          .charAt(0)
                          .toUpperCase()
                      : "U"}
                  </Text>
                </View>

                <View className="ml-4 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-base font-black text-gray-900"
                  >
                    {item.fullName ||
                      "Unknown User"}
                  </Text>

                  <Text
                    numberOfLines={1}
                    className="mt-1 text-xs font-semibold text-gray-400"
                  >
                    {item.email ||
                      "No email"}
                  </Text>

                  <View className="mt-2 flex-row items-center">
                    <View className="rounded-full bg-red-50 px-3 py-1">
                      <Text className="text-[10px] font-black text-red-600">
                        {item.bloodType ||
                          "N/A"}
                      </Text>
                    </View>

                    {item.location && (
                      <Text
                        numberOfLines={1}
                        className="ml-2 flex-1 text-[10px] font-bold text-gray-400"
                      >
                        {item.location}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Status */}

              <View className="mt-5 flex-row items-center justify-between border-t border-gray-100 pt-4">
                <View>
                  <Text className="text-[10px] font-black uppercase text-gray-400">
                    Role
                  </Text>

                  <Text className="mt-1 text-xs font-bold text-gray-700">
                    {item.role === "bloodBankAdmin"
                      ? "Blood Bank Admin"
                      : "User"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    const makingAdmin =
                      item.role !== "bloodBankAdmin";

                    Alert.alert(
                      makingAdmin
                        ? "Blood Bank Admin"
                        : "Remove Admin Access",
                      makingAdmin
                        ? `Give ${item.fullName || "this user"} access to the blood bank?`
                        : `Remove blood bank access from ${item.fullName || "this user"}?`,
                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: makingAdmin
                            ? "Give Access"
                            : "Remove",
                          onPress: () =>
                            toggleBloodBankRole(item),
                        },
                      ]
                    );
                  }}
                  className="rounded-xl bg-cyan-50 px-4 py-2"
                >
                  <Text className="text-xs font-black text-cyan-700">
                    {item.role === "bloodBankAdmin"
                      ? "Remove Access"
                      : "Blood Bank Access"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-4">
                <View
                  className={`rounded-full px-3 py-2 ${
                    isActive
                      ? "bg-green-50"
                      : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase ${
                      isActive
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {isActive
                      ? "Active"
                      : "Disabled"}
                  </Text>
                </View>

                {/* Enable / Disable */}

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      isActive
                        ? "Disable User"
                        : "Enable User",

                      isActive
                        ? `Disable ${
                            item.fullName ||
                            "this user"
                          }?`
                        : `Enable ${
                            item.fullName ||
                            "this user"
                          }?`,

                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: isActive
                            ? "Disable"
                            : "Enable",

                          onPress: () =>
                            toggleUserStatus(
                              item
                            ),
                        },
                      ]
                    );
                  }}
                  className={`rounded-xl px-4 py-2 ${
                    isActive
                      ? "bg-red-50"
                      : "bg-green-50"
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      isActive
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {isActive
                      ? "Disable"
                      : "Enable"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default ManageUsers;
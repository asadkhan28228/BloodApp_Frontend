import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiRequest } from "@/src/lib/api";

// ======================================================
// TYPES
// ======================================================

type BloodBank = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  location?: string;
  address?: string;
  role?: string;
  isActive?: boolean;
};

// ======================================================
// HELPER
// Backend PascalCase/camelCase dono support
// ======================================================

const getValue = (
  item: any,
  ...keys: string[]
) => {
  for (const key of keys) {
    if (
      item?.[key] !== undefined &&
      item?.[key] !== null
    ) {
      return item[key];
    }
  }

  return undefined;
};

// ======================================================
// MAIN ADMIN - BLOOD BANKS SCREEN
// ======================================================

const MainAdminBloodBanks = () => {
  const [bloodBanks, setBloodBanks] =
    useState<BloodBank[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ====================================================
  // LOAD ALL BLOOD BANK ADMINS
  // ====================================================

  const loadBloodBanks = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError("");

        // Main Admin endpoint
        const users =
          await apiRequest<any[]>(
            "/api/user"
          );

        const rows = (
          Array.isArray(users)
            ? users
            : []
        )
          // Sirf Blood Bank Admin accounts
          .filter((user) => {
            const role = String(
              getValue(
                user,
                "role",
                "Role"
              ) || ""
            )
              .trim()
              .toLowerCase();

            return (
              role ===
              "bloodbankadmin"
            );
          })

          // Backend response ko UI model mein map
          .map((user) => ({
            id: String(
              getValue(
                user,
                "id",
                "Id"
              ) || ""
            ),

            fullName: getValue(
              user,
              "fullName",
              "FullName"
            ),

            name: getValue(
              user,
              "name",
              "Name"
            ),

            email: getValue(
              user,
              "email",
              "Email"
            ),

            phoneNumber: getValue(
              user,
              "phoneNumber",
              "PhoneNumber"
            ),

            phone: getValue(
              user,
              "phone",
              "Phone"
            ),

            location: getValue(
              user,
              "location",
              "Location"
            ),

            address: getValue(
              user,
              "address",
              "Address"
            ),

            role: getValue(
              user,
              "role",
              "Role"
            ),

            isActive:
              getValue(
                user,
                "isActive",
                "IsActive"
              ) !== false,
          }))

          // Alphabetical order
          .sort((a, b) => {
            const nameA =
              a.fullName ||
              a.name ||
              "";

            const nameB =
              b.fullName ||
              b.name ||
              "";

            return nameA.localeCompare(
              nameB
            );
          });

        setBloodBanks(rows);
      } catch (e: any) {
        console.error(
          "Failed to load blood banks:",
          e
        );

        setError(
          e?.message ||
            "Blood bank information load nahi ho saki. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    loadBloodBanks();
  }, [loadBloodBanks]);

  // ====================================================
  // COUNTS
  // ====================================================

  const activeCount =
    useMemo(
      () =>
        bloodBanks.filter(
          (bank) =>
            bank.isActive !== false
        ).length,
      [bloodBanks]
    );

  const inactiveCount =
    useMemo(
      () =>
        bloodBanks.filter(
          (bank) =>
            bank.isActive === false
        ).length,
      [bloodBanks]
    );

  // ====================================================
  // REFRESH
  // ====================================================

  const onRefresh = () => {
    setRefreshing(true);

    loadBloodBanks(true);
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <SafeAreaView
      className="flex-1 bg-[#F7F8FC]"
      edges={["top"]}
    >
      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <View className="border-b border-gray-100 bg-white px-5 pb-4 pt-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            activeOpacity={0.8}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-50"
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color="#111827"
            />
          </TouchableOpacity>

          <View className="ml-3 flex-1">
            <Text className="text-[22px] font-black text-gray-900">
              Blood Banks
            </Text>

            <Text className="mt-0.5 text-[11px] font-medium text-gray-400">
              Registered blood bank
              information
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
            <Ionicons
              name="business"
              size={21}
              color="#DC2626"
            />
          </View>
        </View>
      </View>

      {/* ============================================= */}
      {/* CONTENT */}
      {/* ============================================= */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#DC2626"
          />
        }
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        {/* =========================================== */}
        {/* NETWORK OVERVIEW */}
        {/* =========================================== */}

        <View className="mx-5 mt-5 overflow-hidden rounded-[28px] bg-red-600 p-5">
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Ionicons
                name="business-outline"
                size={27}
                color="#FFFFFF"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-red-100">
                Network Overview
              </Text>

              <Text className="mt-1 text-xl font-black text-white">
                Total Blood Banks
              </Text>

              <Text className="mt-1 text-[11px] font-medium text-red-100">
                Registered blood bank
                accounts
              </Text>
            </View>

            <Text className="text-[42px] font-black text-white">
              {bloodBanks.length}
            </Text>
          </View>

          <View className="mt-4 h-px bg-white/15" />

          <View className="mt-4 flex-row items-center">
            <View className="flex-row items-center">
              <View className="h-2 w-2 rounded-full bg-white" />

              <Text className="ml-2 text-[11px] font-bold text-white">
                {activeCount} Active
              </Text>
            </View>

            {inactiveCount > 0 && (
              <View className="ml-4 flex-row items-center">
                <View className="h-2 w-2 rounded-full bg-red-200" />

                <Text className="ml-2 text-[11px] font-bold text-red-100">
                  {inactiveCount} Inactive
                </Text>
              </View>
            )}

            <Text className="ml-auto text-[10px] font-semibold text-red-100">
              Pull to refresh
            </Text>
          </View>
        </View>

        {/* =========================================== */}
        {/* SECTION TITLE */}
        {/* =========================================== */}

        <View className="mx-5 mb-3 mt-7 flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-xl font-black text-gray-900">
              Blood Bank Details
            </Text>

            <Text className="mt-1 text-[11px] font-medium text-gray-400">
              All registered blood banks
            </Text>
          </View>

          {!loading && (
            <View className="rounded-full bg-red-50 px-3 py-1.5">
              <Text className="text-[10px] font-black text-red-600">
                {bloodBanks.length} TOTAL
              </Text>
            </View>
          )}
        </View>

        {/* =========================================== */}
        {/* LOADING */}
        {/* =========================================== */}

        {loading ? (
          <View className="mx-5 mt-2 items-center rounded-[26px] border border-gray-100 bg-white py-16">
            <ActivityIndicator
              size="small"
              color="#DC2626"
            />

            <Text className="mt-3 text-xs font-semibold text-gray-400">
              Loading blood banks...
            </Text>
          </View>
        ) : error ? (
          /* ========================================= */
          /* ERROR */
          /* ========================================= */

          <View className="mx-5 mt-2 items-center rounded-[26px] border border-red-100 bg-white px-6 py-12">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Ionicons
                name="alert-circle-outline"
                size={26}
                color="#DC2626"
              />
            </View>

            <Text className="mt-4 text-center text-sm font-black text-gray-800">
              Could not load blood banks
            </Text>

            <Text className="mt-1 text-center text-[11px] leading-5 text-gray-400">
              {error}
            </Text>

            <TouchableOpacity
              onPress={() =>
                loadBloodBanks()
              }
              activeOpacity={0.85}
              className="mt-5 rounded-xl bg-red-600 px-6 py-3"
            >
              <Text className="text-xs font-black text-white">
                TRY AGAIN
              </Text>
            </TouchableOpacity>
          </View>
        ) : bloodBanks.length === 0 ? (
          /* ========================================= */
          /* EMPTY */
          /* ========================================= */

          <View className="mx-5 mt-2 items-center rounded-[26px] border border-gray-100 bg-white px-6 py-14">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
              <Ionicons
                name="business-outline"
                size={28}
                color="#9CA3AF"
              />
            </View>

            <Text className="mt-4 text-sm font-black text-gray-700">
              No Blood Banks Found
            </Text>

            <Text className="mt-1 text-center text-[11px] leading-5 text-gray-400">
              Registered Blood Bank
              accounts yahan automatically
              show honge.
            </Text>
          </View>
        ) : (
          /* ========================================= */
          /* BLOOD BANK LIST */
          /* ========================================= */

          <View className="mx-5">
            {bloodBanks.map(
              (bank, index) => {
                const name =
                  bank.fullName?.trim() ||
                  bank.name?.trim() ||
                  "Blood Bank";

                const email =
                  bank.email?.trim() ||
                  "Not provided";

                const phone =
                  bank.phoneNumber?.trim() ||
                  bank.phone?.trim() ||
                  "Not provided";

                const location =
                  bank.location?.trim() ||
                  bank.address?.trim() ||
                  "Not provided";

                const isActive =
                  bank.isActive !== false;

                return (
                  <View
                    key={
                      bank.id ||
                      String(index)
                    }
                    className="mb-4 overflow-hidden rounded-[26px] border border-gray-100 bg-white"
                  >
                    {/* TOP RED LINE */}

                    <View className="h-1 bg-red-500" />

                    <View className="p-5">
                      {/* ================================= */}
                      {/* BANK HEADER */}
                      {/* ================================= */}

                      <View className="flex-row items-center">
                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                          <Ionicons
                            name="business-outline"
                            size={23}
                            color="#DC2626"
                          />
                        </View>

                        <View className="ml-3 flex-1">
                          <Text
                            numberOfLines={
                              1
                            }
                            className="text-[17px] font-black text-gray-900"
                          >
                            {name}
                          </Text>

                          <Text className="mt-1 text-[10px] font-black uppercase tracking-wider text-red-500">
                            Blood Bank
                          </Text>
                        </View>

                        {/* STATUS */}

                        <View
                          className={`flex-row items-center rounded-full px-3 py-1.5 ${
                            isActive
                              ? "bg-green-50"
                              : "bg-gray-100"
                          }`}
                        >
                          <View
                            className={`mr-1.5 h-2 w-2 rounded-full ${
                              isActive
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />

                          <Text
                            className={`text-[9px] font-black ${
                              isActive
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          >
                            {isActive
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </Text>
                        </View>
                      </View>

                      {/* ================================= */}
                      {/* BANK INFORMATION */}
                      {/* ================================= */}

                      <View className="mt-5 rounded-2xl bg-gray-50 px-4">
                        <InfoRow
                          icon="mail-outline"
                          label="Email"
                          value={email}
                        />

                        <InfoRow
                          icon="call-outline"
                          label="Phone"
                          value={phone}
                        />

                        <InfoRow
                          icon="location-outline"
                          label="Location"
                          value={location}
                          last
                        />
                      </View>

                      {/* ================================= */}
                      {/* CARD FOOTER */}
                      {/* ================================= */}

                      <View className="mt-4 flex-row items-center justify-between">
                        <Text className="text-[10px] font-bold text-gray-400">
                          Blood Bank #
                          {index + 1}
                        </Text>

                        <View className="flex-row items-center">
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={14}
                            color="#DC2626"
                          />

                          <Text className="ml-1 text-[9px] font-black uppercase text-red-500">
                            Registered
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ======================================================
// INFORMATION ROW
// ======================================================

const InfoRow = ({
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
        last
          ? ""
          : "border-b border-gray-100"
      }`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
        <Ionicons
          name={icon}
          size={17}
          color="#6B7280"
        />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[9px] font-black uppercase tracking-wider text-gray-400">
          {label}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-1 text-[12px] font-bold leading-5 text-gray-700"
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

export default MainAdminBloodBanks;
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "@/src/lib/backendCompat";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "@/src/lib/backendCompat";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../../../config/backendConfig";
import { db } from "../../../config/backendConfig";
import { useUserStore } from "../../../store/userStore";
import { BLOOD_TYPES } from "../../../utils/bloodReserve";
import { getFreshGpsLocation } from "../../../utils/locationService";

const DEFAULT_SHELF_LIFE_DAYS = 35;
const PAK_PHONE_REGEX = /^(?:\+92|0)3\d{9}$/;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ======================================================
// SHARED SECTION HEADER
// ======================================================

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) => (
  <View className="mb-4 flex-row items-center">
    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
      <Ionicons name={icon} size={22} color="#DC2626" />
    </View>

    <View className="ml-3 flex-1">
      <Text className="text-lg font-black text-gray-900">{title}</Text>

      <Text className="mt-0.5 text-[11px] font-medium leading-4 text-gray-400">
        {subtitle}
      </Text>
    </View>
  </View>
);

// ======================================================
// SECTION CARD
// ======================================================

const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <View className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
    {children}
  </View>
);

// ======================================================
// SECTION 1 — STOCK
// ======================================================

interface InventoryRow {
  bloodType: string;
  units: number;
}

const StockSection = () => {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);

      const rows: InventoryRow[] = await Promise.all(
        BLOOD_TYPES.map(async (bloodType) => {
          const snapshot = await getDoc(
            doc(db, "blood-inventory", bloodType)
          );

          const units =
            snapshot.exists() &&
            typeof snapshot.data().units === "number"
              ? snapshot.data().units
              : 0;

          return { bloodType, units };
        })
      );

      setInventory(rows);

      const drafts: Record<string, string> = {};

      rows.forEach((row) => {
        drafts[row.bloodType] = String(row.units);
      });

      setDraftValues(drafts);
    } catch (error) {
      console.error("Error fetching blood inventory:", error);
      Alert.alert("Error", "Could not load blood bank inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const saveUnits = async (bloodType: string) => {
    const rawValue = draftValues[bloodType] ?? "0";
    const parsedUnits = parseInt(rawValue, 10);

    if (isNaN(parsedUnits) || parsedUnits < 0) {
      Alert.alert(
        "Invalid Value",
        "Please enter a valid non-negative number of units."
      );
      return;
    }

    setSavingType(bloodType);

    try {
      await setDoc(
        doc(db, "blood-inventory", bloodType),
        {
          bloodType,
          units: parsedUnits,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setInventory((current) =>
        current.map((row) =>
          row.bloodType === bloodType
            ? { ...row, units: parsedUnits }
            : row
        )
      );

      Alert.alert(
        "Saved",
        `${bloodType} stock updated to ${parsedUnits} unit(s).`
      );
    } catch (error) {
      console.error("Error saving blood inventory:", error);
      Alert.alert("Error", "Could not update stock level.");
    } finally {
      setSavingType(null);
    }
  };

  const adjustUnits = (bloodType: string, delta: number) => {
    setDraftValues((current) => {
      const currentValue =
        parseInt(current[bloodType] ?? "0", 10) || 0;

      const nextValue = Math.max(0, currentValue + delta);

      return {
        ...current,
        [bloodType]: String(nextValue),
      };
    });
  };

  const totalUnits = inventory.reduce(
    (sum, row) => sum + row.units,
    0
  );

  const lowStockCount = inventory.filter(
    (row) => row.units <= 2
  ).length;

  const availableTypes = inventory.filter(
    (row) => row.units > 0
  ).length;

  return (
    <View className="mx-5 mt-6">
      <SectionHeader
        icon="water-outline"
        title="Blood Stock"
        subtitle="Manage available blood units and monitor low-stock groups."
      />

      <SectionCard>
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="small" color="#DC2626" />

            <Text className="mt-3 text-xs font-semibold text-gray-400">
              Loading inventory...
            </Text>
          </View>
        ) : (
          <>
            {/* SUMMARY */}

            <View className="mb-5 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-red-50 p-4">
                <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="water"
                    size={18}
                    color="#DC2626"
                  />
                </View>

                <Text className="text-2xl font-black text-red-600">
                  {totalUnits}
                </Text>

                <Text className="mt-1 text-[10px] font-black uppercase tracking-wide text-red-400">
                  Total Units
                </Text>
              </View>

              <View className="flex-1 rounded-2xl bg-green-50 p-4">
                <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#16A34A"
                  />
                </View>

                <Text className="text-2xl font-black text-green-600">
                  {availableTypes}
                </Text>

                <Text className="mt-1 text-[10px] font-black uppercase tracking-wide text-green-500">
                  Available Types
                </Text>
              </View>

              <View className="flex-1 rounded-2xl bg-amber-50 p-4">
                <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="warning"
                    size={18}
                    color="#D97706"
                  />
                </View>

                <Text className="text-2xl font-black text-amber-600">
                  {lowStockCount}
                </Text>

                <Text className="mt-1 text-[10px] font-black uppercase tracking-wide text-amber-500">
                  Low Stock
                </Text>
              </View>
            </View>

            {/* BLOOD TYPES */}

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-black uppercase tracking-wider text-gray-500">
                Blood Type Inventory
              </Text>

              <Text className="text-[10px] font-semibold text-gray-400">
                8 Groups
              </Text>
            </View>

            {inventory.map((item, index) => {
              const isLow = item.units <= 2;
              const isEmpty = item.units === 0;
              const isLast = index === inventory.length - 1;

              return (
                <View
                  key={item.bloodType}
                  className={`py-3.5 ${
                    isLast
                      ? ""
                      : "border-b border-gray-100"
                  }`}
                >
                  <View className="flex-row items-center">
                    {/* BLOOD ICON */}

                    <View
                      className={`h-11 w-11 items-center justify-center rounded-2xl ${
                        isEmpty
                          ? "bg-gray-100"
                          : isLow
                            ? "bg-amber-50"
                            : "bg-red-50"
                      }`}
                    >
                      <Ionicons
                        name="water"
                        size={16}
                        color={
                          isEmpty
                            ? "#9CA3AF"
                            : isLow
                              ? "#D97706"
                              : "#DC2626"
                        }
                      />

                      <Text
                        className={`-mt-1 text-[9px] font-black ${
                          isEmpty
                            ? "text-gray-500"
                            : isLow
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {item.bloodType}
                      </Text>
                    </View>

                    {/* INFO */}

                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-black text-gray-900">
                        {item.bloodType} Blood
                      </Text>

                      <View className="mt-1 flex-row items-center">
                        <View
                          className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            isEmpty
                              ? "bg-gray-400"
                              : isLow
                                ? "bg-amber-500"
                                : "bg-green-500"
                          }`}
                        />

                        <Text
                          className={`text-[10px] font-bold ${
                            isEmpty
                              ? "text-gray-400"
                              : isLow
                                ? "text-amber-600"
                                : "text-green-600"
                          }`}
                        >
                          {isEmpty
                            ? "Out of stock"
                            : isLow
                              ? "Low stock"
                              : "Available"}
                        </Text>
                      </View>
                    </View>

                    {/* CONTROLS */}

                    <TouchableOpacity
                      onPress={() =>
                        adjustUnits(item.bloodType, -1)
                      }
                      activeOpacity={0.7}
                      className="h-9 w-9 items-center justify-center rounded-xl bg-gray-100"
                    >
                      <Ionicons
                        name="remove"
                        size={16}
                        color="#374151"
                      />
                    </TouchableOpacity>

                    <TextInput
                      value={
                        draftValues[item.bloodType] ??
                        String(item.units)
                      }
                      onChangeText={(text) =>
                        setDraftValues((current) => ({
                          ...current,
                          [item.bloodType]:
                            text.replace(/[^0-9]/g, ""),
                        }))
                      }
                      keyboardType="number-pad"
                      className="mx-1.5 h-9 w-14 rounded-xl border border-gray-200 bg-gray-50 text-center text-sm font-black text-gray-900"
                    />

                    <TouchableOpacity
                      onPress={() =>
                        adjustUnits(item.bloodType, 1)
                      }
                      activeOpacity={0.7}
                      className="h-9 w-9 items-center justify-center rounded-xl bg-gray-100"
                    >
                      <Ionicons
                        name="add"
                        size={16}
                        color="#374151"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        saveUnits(item.bloodType)
                      }
                      disabled={
                        savingType === item.bloodType
                      }
                      activeOpacity={0.8}
                      className="ml-2 h-9 items-center justify-center rounded-xl bg-red-600 px-3"
                    >
                      {savingType === item.bloodType ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />
                      ) : (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="#FFFFFF"
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </SectionCard>
    </View>
  );
};

// ======================================================
// SECTION 2 — EXPIRY
// ======================================================

interface BatchRow {
  id: string;
  bloodType: string;
  units: number;
  expiresAtMs: number;
}

const ExpirySection = () => {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [batchesLoading, setBatchesLoading] =
    useState(true);
  const [addingBatch, setAddingBatch] =
    useState(false);
  const [clearingExpired, setClearingExpired] =
    useState(false);
  const [showAddForm, setShowAddForm] =
    useState(false);

  const [newBatchType, setNewBatchType] =
    useState(BLOOD_TYPES[0]);

  const [newBatchUnits, setNewBatchUnits] =
    useState("");

  const [newBatchShelfDays, setNewBatchShelfDays] =
    useState(String(DEFAULT_SHELF_LIFE_DAYS));

  const fetchBatches = useCallback(async () => {
    try {
      setBatchesLoading(true);

      const snapshot = await getDocs(
        query(
          collection(db, "blood-batches"),
          orderBy("expiresAtMs", "asc")
        )
      );

      const rows: BatchRow[] = snapshot.docs.map(
        (docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,
            bloodType: data.bloodType,
            units: data.units,
            expiresAtMs: data.expiresAtMs,
          };
        }
      );

      setBatches(rows);
    } catch (error) {
      console.error(
        "Error fetching blood batches:",
        error
      );
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const addBatch = async () => {
    const parsedUnits = parseInt(newBatchUnits, 10);
    const parsedShelfDays = parseInt(
      newBatchShelfDays,
      10
    );

    if (isNaN(parsedUnits) || parsedUnits <= 0) {
      Alert.alert(
        "Invalid Value",
        "Please enter how many units are in this batch."
      );
      return;
    }

    if (
      isNaN(parsedShelfDays) ||
      parsedShelfDays <= 0
    ) {
      Alert.alert(
        "Invalid Value",
        "Please enter a valid number of days until this batch expires."
      );
      return;
    }

    setAddingBatch(true);

    try {
      const expiresAtMs =
        Date.now() +
        parsedShelfDays * 24 * 60 * 60 * 1000;

      const batchRef = doc(
        collection(db, "blood-batches")
      );

      const inventoryRef = doc(
        db,
        "blood-inventory",
        newBatchType
      );

      await runTransaction(db, async (transaction) => {
        const inventorySnap =
          await transaction.get(inventoryRef);

        const currentUnits =
          inventorySnap.exists() &&
          typeof inventorySnap.data().units === "number"
            ? inventorySnap.data().units
            : 0;

        transaction.set(batchRef, {
          bloodType: newBatchType,
          units: parsedUnits,
          expiresAtMs,
          addedAt: serverTimestamp(),
        });

        transaction.set(
          inventoryRef,
          {
            bloodType: newBatchType,
            units: currentUnits + parsedUnits,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      });

      setNewBatchUnits("");

      setNewBatchShelfDays(
        String(DEFAULT_SHELF_LIFE_DAYS)
      );

      setShowAddForm(false);

      await fetchBatches();

      Alert.alert(
        "Batch Added",
        `${parsedUnits} unit(s) of ${newBatchType} logged and added to Stock automatically.`
      );
    } catch (error) {
      console.error("Error adding blood batch:", error);

      Alert.alert(
        "Error",
        "Could not add this batch."
      );
    } finally {
      setAddingBatch(false);
    }
  };

  const removeBatchAndAdjustStock = async (
    batch: BatchRow
  ) => {
    const batchRef = doc(
      db,
      "blood-batches",
      batch.id
    );

    const inventoryRef = doc(
      db,
      "blood-inventory",
      batch.bloodType
    );

    await runTransaction(db, async (transaction) => {
      const inventorySnap =
        await transaction.get(inventoryRef);

      const currentUnits =
        inventorySnap.exists() &&
        typeof inventorySnap.data().units === "number"
          ? inventorySnap.data().units
          : 0;

      const remainingUnits = Math.max(
        0,
        currentUnits - batch.units
      );

      transaction.delete(batchRef);

      transaction.set(
        inventoryRef,
        {
          bloodType: batch.bloodType,
          units: remainingUnits,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  };

  const removeBatch = (batch: BatchRow) => {
    Alert.alert(
      "Remove Batch",
      `Remove this batch and deduct ${batch.units} unit(s) of ${batch.bloodType} from Stock too? This keeps Stock and Expiry in sync.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove & Deduct",
          style: "destructive",
          onPress: async () => {
            try {
              await removeBatchAndAdjustStock(batch);

              setBatches((current) =>
                current.filter(
                  (b) => b.id !== batch.id
                )
              );
            } catch (error) {
              console.error(
                "Error removing blood batch:",
                error
              );

              Alert.alert(
                "Error",
                "Could not remove this batch."
              );
            }
          },
        },
      ]
    );
  };

  const clearExpiredBatches = async () => {
    const expired = batches.filter(
      (b) => b.expiresAtMs < Date.now()
    );

    if (expired.length === 0) return;

    const totalUnits = expired.reduce(
      (sum, b) => sum + b.units,
      0
    );

    Alert.alert(
      "Clear Expired Batches",
      `Remove ${expired.length} expired batch(es) (${totalUnits} unit(s) total) and deduct them from Stock so expired blood can never be reserved for an emergency. Continue?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear & Deduct",
          style: "destructive",
          onPress: async () => {
            try {
              setClearingExpired(true);

              for (const batch of expired) {
                await removeBatchAndAdjustStock(batch);
              }

              await fetchBatches();

              Alert.alert(
                "Cleared",
                `${expired.length} expired batch(es) removed and Stock updated.`
              );
            } catch (error) {
              console.error(
                "Error clearing expired batches:",
                error
              );

              Alert.alert(
                "Error",
                "Could not clear all expired batches. Please try again."
              );
            } finally {
              setClearingExpired(false);
            }
          },
        },
      ]
    );
  };

  const getExpiryLabel = (
    expiresAtMs: number
  ) => {
    const daysLeft = Math.ceil(
      (expiresAtMs - Date.now()) /
        (24 * 60 * 60 * 1000)
    );

    if (daysLeft < 0)
      return {
        text: "Expired",
        color: "gray" as const,
      };

    if (daysLeft === 0)
      return {
        text: "Expires today",
        color: "red" as const,
      };

    if (daysLeft <= 3)
      return {
        text: `Expires in ${daysLeft} day${
          daysLeft > 1 ? "s" : ""
        }`,
        color: "red" as const,
      };

    if (daysLeft <= 7)
      return {
        text: `Expires in ${daysLeft} days`,
        color: "amber" as const,
      };

    return {
      text: `${daysLeft} days left`,
      color: "green" as const,
    };
  };

  const badgeColors: Record<
    string,
    {
      bg: string;
      text: string;
    }
  > = {
    red: {
      bg: "bg-red-50",
      text: "text-red-600",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-600",
    },
    gray: {
      bg: "bg-gray-100",
      text: "text-gray-500",
    },
  };

  const expiredCount = batches.filter(
    (b) => b.expiresAtMs < Date.now()
  ).length;

  const expiringSoonCount = batches.filter(
    (b) =>
      b.expiresAtMs >= Date.now() &&
      b.expiresAtMs - Date.now() <=
        SEVEN_DAYS_MS
  ).length;

  const totalBatchUnits = batches.reduce(
    (sum, batch) => sum + batch.units,
    0
  );

  return (
    <View className="mx-5 mt-6">
      <SectionHeader
        icon="time-outline"
        title="Expiry Tracking"
        subtitle="Monitor blood batches and prevent expired units from being used."
      />

      <SectionCard>
        {/* EXPIRY SUMMARY */}

        <View className="mb-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-blue-50 p-4">
            <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="layers-outline"
                size={18}
                color="#2563EB"
              />
            </View>

            <Text className="text-2xl font-black text-blue-600">
              {batches.length}
            </Text>

            <Text className="mt-1 text-[10px] font-black uppercase tracking-wide text-blue-400">
              Batches
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-amber-50 p-4">
            <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="hourglass-outline"
                size={18}
                color="#D97706"
              />
            </View>

            <Text className="text-2xl font-black text-amber-600">
              {expiringSoonCount}
            </Text>

            <Text className="mt-1 text-[10px] font-black uppercase tracking-wide text-amber-500">
              Expiring Soon
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-red-50 p-4">
            <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#DC2626"
              />
            </View>

            <Text className="text-2xl font-black text-red-600">
              {expiredCount}
            </Text>

            <Text className="mt-1 text-[10px] font-black uppercase tracking-wide text-red-400">
              Expired
            </Text>
          </View>
        </View>

        {/* EXPIRED ALERT */}

        {expiredCount > 0 && (
          <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
            <View className="flex-row items-start">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color="#DC2626"
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-sm font-black text-red-700">
                  Expired blood detected
                </Text>

                <Text className="mt-1 text-[11px] leading-4 text-red-500">
                  {expiredCount} batch(es) have expired
                  and should be removed from active stock.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={clearExpiredBatches}
              disabled={clearingExpired}
              activeOpacity={0.85}
              className="mt-3 flex-row items-center justify-center rounded-xl bg-red-600 py-3"
            >
              {clearingExpired ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color="#FFFFFF"
                  />

                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                    Clear Expired
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* EXPIRING SOON */}

        {expiringSoonCount > 0 && (
          <View className="mb-4 flex-row items-center rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="time-outline"
                size={18}
                color="#D97706"
              />
            </View>

            <Text className="ml-3 flex-1 text-[11px] font-bold leading-4 text-amber-700">
              {expiringSoonCount} batch(es) will expire
              within the next 7 days.
            </Text>
          </View>
        )}

        {/* ADD BATCH BUTTON */}

        <TouchableOpacity
          onPress={() =>
            setShowAddForm((value) => !value)
          }
          activeOpacity={0.85}
          className="flex-row items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
        >
          <View className="flex-row items-center">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-red-100">
              <Ionicons
                name="add"
                size={20}
                color="#DC2626"
              />
            </View>

            <View className="ml-3">
              <Text className="text-sm font-black text-gray-800">
                Log New Batch
              </Text>

              <Text className="mt-0.5 text-[10px] font-medium text-gray-400">
                Add fresh blood inventory
              </Text>
            </View>
          </View>

          <Ionicons
            name={
              showAddForm
                ? "chevron-up"
                : "chevron-down"
            }
            size={18}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        {/* ADD FORM */}

        {showAddForm && (
          <View className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <Text className="mb-3 text-xs font-black uppercase tracking-wider text-gray-500">
              Select Blood Type
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {BLOOD_TYPES.map((type) => {
                const selected =
                  newBatchType === type;

                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() =>
                      setNewBatchType(type)
                    }
                    activeOpacity={0.8}
                    className={`min-w-[54px] items-center rounded-xl px-3 py-2.5 ${
                      selected
                        ? "bg-red-600"
                        : "border border-gray-200 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-xs font-black ${
                        selected
                          ? "text-white"
                          : "text-gray-600"
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-gray-400">
                  Units
                </Text>

                <View className="flex-row items-center rounded-xl border border-gray-200 bg-white px-3">
                  <Ionicons
                    name="water-outline"
                    size={17}
                    color="#9CA3AF"
                  />

                  <TextInput
                    value={newBatchUnits}
                    onChangeText={(text) =>
                      setNewBatchUnits(
                        text.replace(/[^0-9]/g, "")
                      )
                    }
                    keyboardType="number-pad"
                    placeholder="e.g. 6"
                    placeholderTextColor="#9CA3AF"
                    className="ml-2 flex-1 py-3 text-sm font-bold text-gray-900"
                  />
                </View>
              </View>

              <View className="flex-1">
                <Text className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-gray-400">
                  Expiry Days
                </Text>

                <View className="flex-row items-center rounded-xl border border-gray-200 bg-white px-3">
                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color="#9CA3AF"
                  />

                  <TextInput
                    value={newBatchShelfDays}
                    onChangeText={(text) =>
                      setNewBatchShelfDays(
                        text.replace(/[^0-9]/g, "")
                      )
                    }
                    keyboardType="number-pad"
                    placeholder="e.g. 35"
                    placeholderTextColor="#9CA3AF"
                    className="ml-2 flex-1 py-3 text-sm font-bold text-gray-900"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={addBatch}
              disabled={addingBatch}
              activeOpacity={0.85}
              className="mt-4 flex-row items-center justify-center rounded-xl bg-red-600 py-3.5"
            >
              {addingBatch ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                    Add Blood Batch
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* BATCH LIST */}

        <View className="mt-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xs font-black uppercase tracking-wider text-gray-500">
              Recent Batches
            </Text>

            <Text className="text-[10px] font-semibold text-gray-400">
              {totalBatchUnits} total units
            </Text>
          </View>

          {batchesLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator
                size="small"
                color="#DC2626"
              />
            </View>
          ) : batches.length === 0 ? (
            <View className="items-center rounded-2xl bg-gray-50 py-10">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="file-tray-outline"
                  size={25}
                  color="#D1D5DB"
                />
              </View>

              <Text className="mt-3 text-sm font-black text-gray-500">
                No batches logged
              </Text>

              <Text className="mt-1 text-[10px] font-medium text-gray-400">
                Add a batch to start expiry tracking
              </Text>
            </View>
          ) : (
            batches.map((item, index) => {
              const expiry = getExpiryLabel(
                item.expiresAtMs
              );

              const colors =
                badgeColors[expiry.color];

              const isLast =
                index === batches.length - 1;

              return (
                <View
                  key={item.id}
                  className={`py-3.5 ${
                    isLast
                      ? ""
                      : "border-b border-gray-100"
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
                      <Ionicons
                        name="water"
                        size={15}
                        color="#DC2626"
                      />

                      <Text className="-mt-1 text-[9px] font-black text-red-600">
                        {item.bloodType}
                      </Text>
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-black text-gray-900">
                        {item.units} unit
                        {item.units !== 1
                          ? "s"
                          : ""}
                      </Text>

                      <View
                        className={`mt-1.5 self-start rounded-full px-2.5 py-1 ${colors.bg}`}
                      >
                        <Text
                          className={`text-[9px] font-black ${colors.text}`}
                        >
                          {expiry.text}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        removeBatch(item)
                      }
                      activeOpacity={0.7}
                      className="h-9 w-9 items-center justify-center rounded-xl bg-gray-100"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </SectionCard>
    </View>
  );
};

// ======================================================
// SECTION 3 — CONTACT
// ======================================================

const ContactSection = () => {
  const [contactLoading, setContactLoading] =
    useState(true);

  const [contactSaving, setContactSaving] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [bloodBankName, setBloodBankName] =
    useState("");

  const [bloodBankPhone, setBloodBankPhone] =
    useState("");

  const [bloodBankAddress, setBloodBankAddress] =
    useState("");

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState("");

  const fetchContactInfo = useCallback(async () => {
    try {
      setContactLoading(true);

      const snapshot = await getDoc(
        doc(db, "settings", "bloodBank")
      );

      if (snapshot.exists()) {
        const data = snapshot.data();

        setBloodBankName(data.name || "");
        setBloodBankPhone(
          data.phoneNumber || ""
        );
        setBloodBankAddress(
          data.address || ""
        );

        setLatitude(
          typeof data.latitude === "number"
            ? data.latitude
            : null
        );

        setLongitude(
          typeof data.longitude === "number"
            ? data.longitude
            : null
        );

        if (data.updatedAt?.toDate) {
          setLastUpdated(
            data.updatedAt
              .toDate()
              .toLocaleString()
          );
        }

        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    } catch (error) {
      console.error(
        "Error fetching blood bank contact info:",
        error
      );
    } finally {
      setContactLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContactInfo();
  }, [fetchContactInfo]);

  const useCurrentLocation = async () => {
    setLocating(true);

    try {
      const coords = await getFreshGpsLocation();

      if (!coords) {
        Alert.alert(
          "Location Not Available",
          "Could not get GPS location. Please check location permission."
        );

        return;
      }

      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
    } finally {
      setLocating(false);
    }
  };

  const saveContactInfo = async () => {
    if (!bloodBankName.trim()) {
      Alert.alert(
        "Invalid Value",
        "Please enter the blood bank / hospital name."
      );

      return;
    }

    if (
      !PAK_PHONE_REGEX.test(
        bloodBankPhone.trim()
      )
    ) {
      Alert.alert(
        "Invalid Value",
        "Please enter a valid Pakistani phone number (e.g. +923XXXXXXXXX or 03XXXXXXXXX)."
      );

      return;
    }

    setContactSaving(true);

    try {
      await setDoc(
        doc(db, "settings", "bloodBank"),
        {
          name: bloodBankName.trim(),
          phoneNumber: bloodBankPhone.trim(),
          address: bloodBankAddress.trim(),
          latitude,
          longitude,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        "Saved",
        "Blood bank contact info updated."
      );

      await fetchContactInfo();
      setIsEditing(false);
    } catch (error) {
      console.error(
        "Error saving blood bank contact info:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save contact info."
      );
    } finally {
      setContactSaving(false);
    }
  };

  return (
    <View className="mx-5 mb-10 mt-6">
      <SectionHeader
        icon="call-outline"
        title="Blood Bank Contact"
        subtitle="Keep official blood bank information available for emergency reporters."
      />

      <SectionCard>
        {contactLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator
              size="small"
              color="#DC2626"
            />

            <Text className="mt-3 text-xs font-semibold text-gray-400">
              Loading contact information...
            </Text>
          </View>
        ) : (
          <>
            {/* STATUS */}

            <View className="mb-5 flex-row items-center rounded-2xl bg-green-50 p-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#16A34A"
                />
              </View>

              <View className="ml-3 flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-black text-green-700">
                    Blood Bank Information
                  </Text>

                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.8}
                    className="flex-row items-center rounded-xl bg-white px-3 py-2"
                  >
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color="#DC2626"
                    />

                    <Text className="ml-1.5 text-[10px] font-black uppercase text-red-600">
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text className="mt-0.5 text-[10px] font-medium leading-4 text-green-600">
                  This information can be shared with
                  reporters during emergency fulfilment.
                </Text>
              </View>
            </View>

            {lastUpdated ? (
              <View className="mb-4 flex-row items-center">
                <Ionicons
                  name="time-outline"
                  size={14}
                  color="#9CA3AF"
                />

                <Text className="ml-1.5 text-[10px] font-semibold text-gray-400">
                  Last updated: {lastUpdated}
                </Text>
              </View>
            ) : null}

            {/* NAME */}

            <Text className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-gray-400">
              Blood Bank / Hospital Name
            </Text>

            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3">
              <Ionicons
                name="business-outline"
                size={18}
                color="#9CA3AF"
              />

              <TextInput
                value={bloodBankName}
                onChangeText={setBloodBankName}
                editable={isEditing}
                placeholder="e.g. Bannu General Hospital Blood Bank"
                placeholderTextColor="#9CA3AF"
                className={`ml-2 flex-1 py-3.5 text-sm font-bold ${isEditing ? "text-gray-900" : "text-gray-500"}`}
              />
            </View>

            {/* PHONE */}

            <Text className="mb-1.5 mt-4 text-[10px] font-black uppercase tracking-wide text-gray-400">
              Phone Number
            </Text>

            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3">
              <Ionicons
                name="call-outline"
                size={18}
                color="#9CA3AF"
              />

              <TextInput
                value={bloodBankPhone}
                onChangeText={setBloodBankPhone}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="+923001234567"
                placeholderTextColor="#9CA3AF"
                className={`ml-2 flex-1 py-3.5 text-sm font-bold ${isEditing ? "text-gray-900" : "text-gray-500"}`}
              />
            </View>

            {/* ADDRESS */}

            <Text className="mb-1.5 mt-4 text-[10px] font-black uppercase tracking-wide text-gray-400">
              Address
            </Text>

            <View className="flex-row items-start rounded-xl border border-gray-200 bg-gray-50 px-3">
              <Ionicons
                name="location-outline"
                size={18}
                color="#9CA3AF"
                style={{ marginTop: 14 }}
              />

              <TextInput
                value={bloodBankAddress}
                onChangeText={setBloodBankAddress}
                editable={isEditing}
                placeholder="e.g. Bannu General Hospital, Bannu"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className={`ml-2 min-h-[85px] flex-1 py-3.5 text-sm font-bold ${isEditing ? "text-gray-900" : "text-gray-500"}`}
              />
            </View>

            {/* GPS */}

            <View className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <View className="flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="navigate-outline"
                    size={18}
                    color="#EA580C"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-xs font-black text-gray-800">
                    GPS Location
                  </Text>

                  <Text className="mt-0.5 text-[10px] text-gray-400">
                    Used for accurate map directions
                  </Text>
                </View>
              </View>

              {latitude !== null &&
              longitude !== null ? (
                <View className="mt-3 rounded-xl bg-green-50 p-3">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#16A34A"
                    />

                    <Text className="ml-2 text-[10px] font-bold text-green-700">
                      Location pinned successfully
                    </Text>
                  </View>

                  <Text className="mt-1 text-[10px] font-medium text-green-600">
                    {latitude.toFixed(5)},{" "}
                    {longitude.toFixed(5)}
                  </Text>
                </View>
              ) : (
                <View className="mt-3 rounded-xl bg-white p-3">
                  <Text className="text-[10px] font-semibold leading-4 text-gray-400">
                    No GPS pin set yet. Address search
                    will be used instead.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={useCurrentLocation}
                disabled={locating || !isEditing}
                activeOpacity={0.85}
                className={`mt-3 flex-row items-center justify-center rounded-xl border py-3 ${isEditing ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-100"}`}
              >
                {locating ? (
                  <ActivityIndicator
                    size="small"
                    color="#EA580C"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="locate-outline"
                      size={17}
                      color={isEditing ? "#EA580C" : "#9CA3AF"}
                    />

                    <Text className={`ml-2 text-xs font-black uppercase tracking-wide ${isEditing ? "text-orange-600" : "text-gray-400"}`}>
                      Use Current Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* SAVE */}

            {isEditing && (
              <View className="mt-5 flex-row">
                <TouchableOpacity
                  onPress={() => {
                    fetchContactInfo();
                  }}
                  disabled={contactSaving}
                  activeOpacity={0.85}
                  className="mr-3 flex-1 flex-row items-center justify-center rounded-xl bg-gray-100 py-4"
                >
                  <Ionicons
                    name="close-outline"
                    size={18}
                    color="#6B7280"
                  />

                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-gray-600">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveContactInfo}
                  disabled={contactSaving}
                  activeOpacity={0.85}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-red-600 py-4"
                >
                  {contactSaving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                        Save Changes
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </SectionCard>
    </View>
  );
};

// ======================================================
// MAIN SCREEN
// ======================================================

const BloodInventoryManagement = () => {
  const { clearUser } = useUserStore();

  const [activeSection, setActiveSection] =
    useState<
      "stock" | "expiry" | "contact"
    >("stock");

  const sections = [
    {
      key: "stock" as const,
      label: "Stock",
      icon: "water-outline" as const,
    },
    {
      key: "expiry" as const,
      label: "Expiry",
      icon: "time-outline" as const,
    },
    {
      key: "contact" as const,
      label: "Contact",
      icon: "call-outline" as const,
    },
  ];

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
              console.error("Blood bank logout error:", error);
              Alert.alert("Error", "Could not logout.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FC]"
      edges={["top"]}
    >
      {/* HEADER */}

      <View className="bg-white px-5 pb-4 pt-3">
        <View className="flex-row items-center">
          <View className="mr-4 h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
            <Ionicons
              name="medical-outline"
              size={22}
              color="#DC2626"
            />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-2xl font-black text-gray-900">
                Blood Bank
              </Text>

              <View className="ml-2 rounded-full bg-red-50 px-2 py-1">
                <Text className="text-[8px] font-black uppercase tracking-wide text-red-600">
                  Admin
                </Text>
              </View>
            </View>

            <Text className="mt-0.5 text-[11px] font-medium text-gray-400">
              Inventory & emergency management
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            accessibilityLabel="Logout"
            className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50"
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color="#DC2626"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS */}

      <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-2">
        <View className="flex-row rounded-2xl bg-gray-100 p-1">
          {sections.map((section) => {
            const isActive =
              activeSection === section.key;

            return (
              <TouchableOpacity
                key={section.key}
                onPress={() =>
                  setActiveSection(section.key)
                }
                activeOpacity={0.85}
                className={`flex-1 flex-row items-center justify-center rounded-xl py-3 ${
                  isActive
                    ? "bg-red-600"
                    : "bg-transparent"
                }`}
              >
                <Ionicons
                  name={section.icon}
                  size={16}
                  color={
                    isActive
                      ? "#FFFFFF"
                      : "#6B7280"
                  }
                />

                <Text
                  className={`ml-1.5 text-xs font-black ${
                    isActive
                      ? "text-white"
                      : "text-gray-500"
                  }`}
                >
                  {section.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* CONTENT */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 35,
        }}
      >
        {activeSection === "stock" && (
          <StockSection />
        )}

        {activeSection === "expiry" && (
          <ExpirySection />
        )}

        {activeSection === "contact" && (
          <ContactSection />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default BloodInventoryManagement;
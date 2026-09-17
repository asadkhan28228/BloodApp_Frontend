import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
} from "@/src/lib/backendCompat";
import React, {
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "../../../config/backendConfig";

interface ReportStats {
  totalUsers: number;
  totalDonors: number;
  availableDonors: number;

  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  cancelledRequests: number;

  totalEmergencies: number;
  activeEmergencies: number;
  resolvedEmergencies: number;
}

interface BloodGroupStats {
  [key: string]: number;
}

const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
];

const AdminReports = () => {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [stats, setStats] =
    useState<ReportStats>({
      totalUsers: 0,
      totalDonors: 0,
      availableDonors: 0,

      totalRequests: 0,
      pendingRequests: 0,
      completedRequests: 0,
      cancelledRequests: 0,

      totalEmergencies: 0,
      activeEmergencies: 0,
      resolvedEmergencies: 0,
    });

  const [
    bloodGroupStats,
    setBloodGroupStats,
  ] = useState<BloodGroupStats>({
    "A+": 0,
    "A-": 0,
    "B+": 0,
    "B-": 0,
    "O+": 0,
    "O-": 0,
    "AB+": 0,
    "AB-": 0,
  });

  // ==========================================
  // FETCH REPORT DATA
  // ==========================================

  const fetchReports = async () => {
    try {
      setLoading(true);

      // ========================================
      // USERS / DONORS
      // ========================================

      const usersSnapshot =
        await getDocs(
          collection(db, "users")
        );

      let totalUsers = 0;
      let totalDonors = 0;
      let availableDonors = 0;

      const groups: BloodGroupStats = {
        "A+": 0,
        "A-": 0,
        "B+": 0,
        "B-": 0,
        "O+": 0,
        "O-": 0,
        "AB+": 0,
        "AB-": 0,
      };

      usersSnapshot.forEach(
        (userDoc : any) => {
          const data =
            userDoc.data();

          // Admin exclude
          if (
            data.role === "admin" ||
            data.role === "bloodBankAdmin"
          ) {
            return;
          }

          totalUsers++;

          if (data.bloodType) {
            totalDonors++;

            if (
              groups[
                data.bloodType
              ] !== undefined
            ) {
              groups[
                data.bloodType
              ]++;
            }

            if (
              data.availableToDonate ===
                true &&
              data.isActive !== false
            ) {
              availableDonors++;
            }
          }
        }
      );

      // ========================================
      // BLOOD REQUESTS
      // ========================================

      const requestSnapshot =
        await getDocs(
          collection(
            db,
            "blood-requests"
          )
        );

      let totalRequests = 0;
      let pendingRequests = 0;
      let completedRequests = 0;
      let cancelledRequests = 0;

      requestSnapshot.forEach(
        (requestDoc : any) => {
          const data =
            requestDoc.data();

          totalRequests++;

          const status =
            data.status ||
            "Pending";

          if (
            status === "Pending"
          ) {
            pendingRequests++;
          }

          if (
            status === "Completed"
          ) {
            completedRequests++;
          }

          if (
            status === "Cancelled"
          ) {
            cancelledRequests++;
          }
        }
      );

      // ========================================
      // EMERGENCIES
      // ========================================

      const emergencySnapshot =
        await getDocs(
          collection(
            db,
            "community_notifications"
          )
        );

      let totalEmergencies = 0;
      let activeEmergencies = 0;
      let resolvedEmergencies = 0;

      emergencySnapshot.forEach(
        (emergencyDoc : any) => {
          const data =
            emergencyDoc.data();

          if (
            data.type !==
            "emergency"
          ) {
            return;
          }

          totalEmergencies++;

          const status =
            data.status ||
            "Active";

          if (
            status === "Resolved"
          ) {
            resolvedEmergencies++;
          } else {
            activeEmergencies++;
          }
        }
      );

      // ========================================
      // SET DATA
      // ========================================

      setStats({
        totalUsers,
        totalDonors,
        availableDonors,

        totalRequests,
        pendingRequests,
        completedRequests,
        cancelledRequests,

        totalEmergencies,
        activeEmergencies,
        resolvedEmergencies,
      });

      setBloodGroupStats(groups);
    } catch (error) {
      console.error(
        "Reports Error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />

        <Text className="mt-4 font-bold text-gray-400">
          Loading Reports...
        </Text>
      </SafeAreaView>
    );
  }

  const maxBloodGroupCount =
    Math.max(
      ...Object.values(
        bloodGroupStats
      ),
      1
    );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom: 50,
        }}
      >
        {/* ==================================
            HEADER
        ================================== */}

        <View className="bg-white px-5 py-5">
          <View className="flex-row items-center">

            <TouchableOpacity
              onPress={() =>
                router.back()
              }
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
                Reports & Analytics
              </Text>

              <Text className="mt-1 text-xs font-semibold text-gray-400">
                Blood Care system overview
              </Text>
            </View>

          </View>
        </View>

        {/* ==================================
            USER OVERVIEW
        ================================== */}

        <View className="px-5 pt-6">

          <SectionTitle
            title="User Overview"
            subtitle="Registered community"
          />

          <View className="mt-4 flex-row flex-wrap justify-between">

            <ReportCard
              title="Users"
              value={
                stats.totalUsers
              }
              icon="people-outline"
            />

            <ReportCard
              title="Donors"
              value={
                stats.totalDonors
              }
              icon="heart-outline"
            />

            <ReportCard
              title="Available"
              value={
                stats.availableDonors
              }
              icon="checkmark-circle-outline"
            />

            <ReportCard
              title="Unavailable"
              value={
                Math.max(
                  stats.totalDonors -
                    stats.availableDonors,
                  0
                )
              }
              icon="close-circle-outline"
            />

          </View>
        </View>

        {/* ==================================
            REQUEST REPORTS
        ================================== */}

        <View className="px-5 pt-6">

          <SectionTitle
            title="Blood Requests"
            subtitle="Request status summary"
          />

          <View className="mt-4 rounded-3xl border border-gray-100 bg-white p-5">

            <SummaryRow
              title="Total Requests"
              value={
                stats.totalRequests
              }
              icon="water-outline"
            />

            <SummaryRow
              title="Pending"
              value={
                stats.pendingRequests
              }
              icon="time-outline"
            />

            <SummaryRow
              title="Completed"
              value={
                stats.completedRequests
              }
              icon="checkmark-done-outline"
            />

            <SummaryRow
              title="Cancelled"
              value={
                stats.cancelledRequests
              }
              icon="close-outline"
              last
            />

          </View>
        </View>

        {/* ==================================
            EMERGENCY REPORTS
        ================================== */}

        <View className="px-5 pt-6">

          <SectionTitle
            title="Emergency Reports"
            subtitle="Emergency response status"
          />

          <View className="mt-4 flex-row flex-wrap justify-between">

            <ReportCard
              title="Total"
              value={
                stats.totalEmergencies
              }
              icon="warning-outline"
            />

            <ReportCard
              title="Active"
              value={
                stats.activeEmergencies
              }
              icon="alert-circle-outline"
            />

            <ReportCard
              title="Resolved"
              value={
                stats.resolvedEmergencies
              }
              icon="checkmark-circle-outline"
              fullWidth
            />

          </View>
        </View>

        {/* ==================================
            BLOOD GROUP DISTRIBUTION
        ================================== */}

        <View className="px-5 pt-6">

          <SectionTitle
            title="Blood Group Distribution"
            subtitle="Registered donors by blood type"
          />

          <View className="mt-4 rounded-3xl border border-gray-100 bg-white p-5">

            {bloodGroups.map(
              (group) => {
                const count =
                  bloodGroupStats[
                    group
                  ] || 0;

                const percentage =
                  (count /
                    maxBloodGroupCount) *
                  100;

                return (
                  <View
                    key={group}
                    className="mb-5"
                  >
                    <View className="mb-2 flex-row items-center justify-between">

                      <View className="flex-row items-center">

                        <View className="h-9 w-12 items-center justify-center rounded-xl bg-red-50">
                          <Text className="font-black text-red-600">
                            {group}
                          </Text>
                        </View>

                        <Text className="ml-3 text-xs font-bold text-gray-500">
                          Donors
                        </Text>

                      </View>

                      <Text className="text-sm font-black text-gray-900">
                        {count}
                      </Text>

                    </View>

                    <View className="h-2 overflow-hidden rounded-full bg-gray-100">

                      <View
                        className="h-full rounded-full bg-red-500"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />

                    </View>

                  </View>
                );
              }
            )}

          </View>
        </View>

        {/* ==================================
            SYSTEM PERFORMANCE
        ================================== */}

        <View className="px-5 pt-6">

          <SectionTitle
            title="System Performance"
            subtitle="Quick effectiveness indicators"
          />

          <View className="mt-4 rounded-3xl border border-gray-100 bg-white p-5">

            <PercentageRow
              label="Request Completion Rate"
              value={
                stats.totalRequests >
                0
                  ? Math.round(
                      (stats.completedRequests /
                        stats.totalRequests) *
                        100
                    )
                  : 0
              }
            />

            <PercentageRow
              label="Emergency Resolution Rate"
              value={
                stats.totalEmergencies >
                0
                  ? Math.round(
                      (stats.resolvedEmergencies /
                        stats.totalEmergencies) *
                        100
                    )
                  : 0
              }
            />

            <PercentageRow
              label="Donor Availability"
              value={
                stats.totalDonors > 0
                  ? Math.round(
                      (stats.availableDonors /
                        stats.totalDonors) *
                        100
                    )
                  : 0
              }
              last
            />

          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ==========================================
// SECTION TITLE
// ==========================================

const SectionTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => {
  return (
    <View>
      <Text className="text-xl font-black text-gray-900">
        {title}
      </Text>

      <Text className="mt-1 text-xs font-semibold text-gray-400">
        {subtitle}
      </Text>
    </View>
  );
};

// ==========================================
// REPORT CARD
// ==========================================

const ReportCard = ({
  title,
  value,
  icon,
  fullWidth = false,
}: {
  title: string;
  value: number;
  icon: any;
  fullWidth?: boolean;
}) => {
  return (
    <View
      className={`mb-4 rounded-3xl border border-gray-100 bg-white p-5 ${
        fullWidth
          ? "w-full"
          : "w-[48%]"
      }`}
    >
      <View className="flex-row items-center justify-between">

        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50">

          <Ionicons
            name={icon}
            size={21}
            color="#DC2626"
          />

        </View>

        <Text className="text-3xl font-black text-gray-900">
          {value}
        </Text>

      </View>

      <Text className="mt-4 text-xs font-black uppercase tracking-wider text-gray-400">
        {title}
      </Text>
    </View>
  );
};

// ==========================================
// SUMMARY ROW
// ==========================================

const SummaryRow = ({
  title,
  value,
  icon,
  last = false,
}: {
  title: string;
  value: number;
  icon: any;
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

      <Text className="ml-4 flex-1 text-sm font-bold text-gray-700">
        {title}
      </Text>

      <Text className="text-lg font-black text-gray-900">
        {value}
      </Text>
    </View>
  );
};

// ==========================================
// PERCENTAGE ROW
// ==========================================

const PercentageRow = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: number;
  last?: boolean;
}) => {
  return (
    <View
      className={`py-4 ${
        !last
          ? "border-b border-gray-100"
          : ""
      }`}
    >

      <View className="flex-row items-center justify-between">

        <Text className="text-sm font-bold text-gray-700">
          {label}
        </Text>

        <Text className="text-sm font-black text-red-600">
          {value}%
        </Text>

      </View>

      <View className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">

        <View
          className="h-full rounded-full bg-red-500"
          style={{
            width: `${Math.min(
              value,
              100
            )}%`,
          }}
        />

      </View>

    </View>
  );
};

export default AdminReports;
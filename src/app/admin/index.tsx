import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
} from "@/src/lib/backendCompat";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "../../config/backendConfig";
import { useUserStore } from "../../store/userStore";

// ======================================================
// TYPES
// ======================================================

interface DashboardStats {
  totalUsers: number;
  totalDonors: number;
  availableDonors: number;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  activeEmergencies: number;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  type: "request" | "emergency";
  createdAt?: any;
}

// ======================================================
// MAIN DASHBOARD
// ======================================================

const AdminDashboard = () => {
  const router = useRouter();
  const { user } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDonors: 0,
    availableDonors: 0,
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    activeEmergencies: 0,
  });

  const [recentActivities, setRecentActivities] =
    useState<RecentActivity[]>([]);

  // ======================================================
  // ANIMATIONS
  // ======================================================

  const headerAnim = useRef(
    new Animated.Value(0)
  ).current;

  const heroAnim = useRef(
    new Animated.Value(0)
  ).current;

  const statsAnim = useRef(
    new Animated.Value(0)
  ).current;

  const emergencyAnim = useRef(
    new Animated.Value(0)
  ).current;

  const managementAnim = useRef(
    new Animated.Value(0)
  ).current;

  const activityAnim = useRef(
    new Animated.Value(0)
  ).current;

  const pulseAnim = useRef(
    new Animated.Value(1)
  ).current;

  // ======================================================
  // START SCREEN ANIMATIONS
  // ======================================================

  useEffect(() => {
    if (loading) return;

    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(emergencyAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(managementAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(activityAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [loading]);

  // ======================================================
  // PULSE ANIMATION
  // ======================================================

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, []);

  const fadeUp = (
    animation: Animated.Value
  ) => ({
    opacity: animation,

    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [25, 0],
        }),
      },
    ],
  });

  // ======================================================
  // LOAD BACKEND DATA
  // ======================================================

  const loadDashboard = useCallback(async () => {
    try {
      // ==========================================
      // USERS
      // ==========================================

      const usersSnapshot = await getDocs(
        collection(db, "users")
      );

      let totalUsers = 0;
      let totalDonors = 0;
      let availableDonors = 0;

      usersSnapshot.forEach((userDoc : any) => {
        const data = userDoc.data();

        // Admin exclude
        if (data.role === "admin") {
          return;
        }

        totalUsers++;

        if (data.bloodType) {
          totalDonors++;

          if (
            data.availableToDonate === true &&
            data.isActive !== false
          ) {
            availableDonors++;
          }
        }
      });

      // ==========================================
      // BLOOD REQUESTS
      // ==========================================

      const requestsSnapshot = await getDocs(
        collection(db, "blood-requests")
      );

      let totalRequests = 0;
      let pendingRequests = 0;
      let completedRequests = 0;

      const activities: RecentActivity[] = [];

      requestsSnapshot.forEach((requestDoc :any) => {
        const data = requestDoc.data();

        totalRequests++;

        const status =
          data.status || "Pending";

        if (status === "Pending") {
          pendingRequests++;
        }

        if (status === "Completed") {
          completedRequests++;
        }

        activities.push({
          id: `request-${requestDoc.id}`,

          title: "Blood Request",

          description: `${
            data.patientName || "Patient"
          } needs ${
            data.bloodType || "blood"
          }`,

          type: "request",

          createdAt: data.createdAt,
        });
      });

      // ==========================================
      // EMERGENCIES
      // ==========================================

      const emergencySnapshot = await getDocs(
        collection(
          db,
          "community_notifications"
        )
      );

      let activeEmergencies = 0;

      emergencySnapshot.forEach(
        (emergencyDoc :any) => {
          const data =
            emergencyDoc.data();

          if (
            data.type !== "emergency"
          ) {
            return;
          }

          const status =
            data.status || "Active";

          if (
            status !== "Resolved"
          ) {
            activeEmergencies++;
          }

          activities.push({
            id: `emergency-${emergencyDoc.id}`,

            title: "Emergency Alert",

            description:
              data.message ||
              data.title ||
              "New emergency reported",

            type: "emergency",

            createdAt: data.createdAt,
          });
        }
      );

      // ==========================================
      // RECENT ACTIVITIES
      // ==========================================

      activities.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setRecentActivities(
        activities.slice(0, 5)
      );

      setStats({
        totalUsers,
        totalDonors,
        availableDonors,
        totalRequests,
        pendingRequests,
        completedRequests,
        activeEmergencies,
      });
    } catch (error) {
      console.error(
        "Admin Dashboard Error:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);

    loadDashboard();
  };

  // ======================================================
  // LOADING SCREEN
  // ======================================================

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <Animated.View
          style={{
            transform: [
              {
                scale: pulseAnim,
              },
            ],
          }}
          className="h-20 w-20 items-center justify-center rounded-[28px] bg-red-50"
        >
          <Ionicons
            name="water"
            size={40}
            color="#E11D2E"
          />
        </Animated.View>

        <ActivityIndicator
          size="large"
          color="#E11D2E"
          style={{
            marginTop: 25,
          }}
        />

        <Text className="mt-4 text-lg font-black text-gray-900">
          Blood Care Admin
        </Text>

        <Text className="mt-1 text-xs font-semibold text-gray-400">
          Loading control center...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#FCFCFD]"
      edges={["top"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FCFCFD"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#E11D2E"]}
            tintColor="#E11D2E"
          />
        }
        contentContainerStyle={{
          paddingBottom: 55,
        }}
      >
        {/* ==================================================
            TOP CONTROL BAR
        ================================================== */}

        <Animated.View
          style={fadeUp(headerAnim)}
          className="px-5 pt-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-2.5 w-2.5 rounded-full bg-green-500" />

              <Text className="text-[10px] font-black uppercase tracking-[3px] text-gray-600">
                Admin Control Center
              </Text>
            </View>

            <View className="flex-row items-center">
              {/* Notification */}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push(
                    "/admin/notifications" as any
                  )
                }
                className="mr-3 h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm"
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color="#111827"
                />

                {stats.activeEmergencies >
                  0 && (
                  <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1">
                    <Text className="text-[9px] font-black text-white">
                      {
                        stats.activeEmergencies
                      }
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Profile */}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push(
                    "/admin/profile" as any
                  )
                }
                className="h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm"
              >
                <Ionicons
                  name="person-outline"
                  size={23}
                  color="#E11D2E"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ==================================================
              WELCOME
          ================================================== */}

          <View className="mt-6 flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <View className="mr-4 h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <Ionicons
                    name="shield-checkmark"
                    size={26}
                    color="#E11D2E"
                  />
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-500">
                    Welcome back,
                  </Text>

                  <View className="flex-row items-center">
                    <Text className="text-[32px] font-black text-gray-950">
                      Admin
                    </Text>

                    <Text className="ml-2 text-[28px]">
                      👋
                    </Text>
                  </View>
                </View>
              </View>

              <Text className="ml-[70px] mt-1 text-xs font-medium text-gray-500">
                Let's continue saving lives together ❤️
              </Text>
            </View>

            {/* Decorative Blood Drop */}

            <Animated.View
              style={{
                transform: [
                  {
                    scale:
                      pulseAnim,
                  },
                ],
              }}
              className="ml-2 h-20 w-20 items-center justify-center rounded-full bg-red-50"
            >
              <Ionicons
                name="water"
                size={46}
                color="#EF233C"
              />

              <View className="absolute h-7 w-7 items-center justify-center rounded-lg bg-white">
                <Ionicons
                  name="add"
                  size={20}
                  color="#EF233C"
                />
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ==================================================
            PREMIUM HERO
        ================================================== */}

        <Animated.View
          style={fadeUp(heroAnim)}
          className="px-4 pt-7"
        >
          <View className="overflow-hidden rounded-[34px] bg-[#E50921] px-6 py-7 shadow-lg">
            {/* Decorative background */}

            <View className="absolute -right-16 -top-12 h-48 w-48 rounded-full bg-white/10" />

            <View className="absolute right-10 top-16 h-32 w-32 rounded-full bg-red-900/10" />

            <View className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-white/5" />

            {/* Badge */}

            <View className="self-start rounded-full bg-red-700/50 px-4 py-2">
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-white">
                Blood Care System
              </Text>
            </View>

            <View className="mt-5 flex-row">
              <View className="flex-1 pr-3">
                <Text className="text-[27px] font-black leading-9 text-white">
                  Every Drop Counts.
                  {"\n"}
                  Every Action Matters.
                </Text>

                <Text className="mt-4 text-[12px] font-medium leading-5 text-red-100">
                  Monitor donors, manage requests and
                  respond to emergencies — in real time.
                </Text>
              </View>

              <Animated.View
                style={{
                  transform: [
                    {
                      scale:
                        pulseAnim,
                    },
                  ],
                }}
                className="mt-5 h-24 w-24 items-center justify-center rounded-full bg-white/10"
              >
                <View className="h-20 w-20 items-center justify-center rounded-full bg-white/10">
                  <Ionicons
                    name="shield-checkmark"
                    size={52}
                    color="white"
                  />
                </View>
              </Animated.View>
            </View>

            {/* System Status */}

            <View className="mt-7 flex-row items-center justify-between border-t border-white/20 pt-5">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <Ionicons
                    name="pulse"
                    size={24}
                    color="white"
                  />
                </View>

                <View className="ml-4">
                  <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-red-100">
                    System Status
                  </Text>

                  <Text className="mt-1 text-sm font-black text-white">
                    Online & Monitoring
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale:
                          pulseAnim,
                      },
                    ],
                  }}
                  className="mr-2 h-3 w-3 rounded-full bg-green-400"
                />

                <Text className="text-sm font-black text-white">
                  LIVE
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ==================================================
            QUICK OVERVIEW
        ================================================== */}

        <Animated.View
          style={fadeUp(statsAnim)}
          className="px-4 pt-8"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name="analytics-outline"
                size={22}
                color="#E11D2E"
              />

              <Text className="ml-2 text-xl font-black text-gray-950">
                Quick Overview
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  "/admin/reports" as any
                )
              }
              className="flex-row items-center"
            >
              <Text className="text-xs font-bold text-red-600">
                View all
              </Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color="#E11D2E"
                style={{
                  marginLeft: 4,
                }}
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            <MiniStatCard
              title="Users"
              value={
                stats.totalUsers
              }
              subtitle="Registered"
              icon="people-outline"
              iconColor="#E11D48"
              iconBackground="#FFE4E6"
              bottomColor="#FB7185"
              delay={0}
            />

            <MiniStatCard
              title="Donors"
              value={
                stats.totalDonors
              }
              subtitle="Blood donors"
              icon="heart-outline"
              iconColor="#EA580C"
              iconBackground="#FFEDD5"
              bottomColor="#FB923C"
              delay={70}
            />

            <MiniStatCard
              title="Available"
              value={
                stats.availableDonors
              }
              subtitle="Ready now"
              icon="checkmark-circle-outline"
              iconColor="#16A34A"
              iconBackground="#DCFCE7"
              bottomColor="#4ADE80"
              delay={140}
            />

            <MiniStatCard
              title="Requests"
              value={
                stats.totalRequests
              }
              subtitle="Total cases"
              icon="water-outline"
              iconColor="#2563EB"
              iconBackground="#DBEAFE"
              bottomColor="#60A5FA"
              delay={210}
            />

            <MiniStatCard
              title="Pending"
              value={
                stats.pendingRequests
              }
              subtitle="Need action"
              icon="time-outline"
              iconColor="#EA8A00"
              iconBackground="#FEF3C7"
              bottomColor="#FBBF24"
              delay={280}
            />

            <MiniStatCard
              title="Completed"
              value={
                stats.completedRequests
              }
              subtitle="Resolved"
              icon="checkmark-outline"
              iconColor="#0D9488"
              iconBackground="#CCFBF1"
              bottomColor="#2DD4BF"
              delay={350}
            />
          </View>
        </Animated.View>

        {/* ==================================================
            EMERGENCY CARD
        ================================================== */}

        <Animated.View
          style={fadeUp(
            emergencyAnim
          )}
          className="px-4 pt-3"
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push(
                "/admin/emergencies" as any
              )
            }
            className="rounded-[30px] border border-red-100 bg-red-50/40 p-5"
          >
            <View className="flex-row items-center">
              <Animated.View
                style={{
                  transform: [
                    {
                      scale:
                        pulseAnim,
                    },
                  ],
                }}
                className="h-16 w-16 items-center justify-center rounded-full bg-red-100"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-600">
                  <Ionicons
                    name="warning"
                    size={25}
                    color="white"
                  />
                </View>
              </Animated.View>

              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-black text-gray-950">
                  Active Emergency Reports
                </Text>

                <Text className="mt-1 text-[11px] font-semibold text-red-500">
                  Immediate attention required
                </Text>
              </View>

              <Text className="mr-4 text-[38px] font-black text-red-600">
                {
                  stats.activeEmergencies
                }
              </Text>

              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color="#E11D2E"
                />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ==================================================
            MANAGEMENT
        ================================================== */}

        <Animated.View
          style={fadeUp(
            managementAnim
          )}
          className="px-4 pt-8"
        >
          <Text className="text-xl font-black text-gray-950">
            Management
          </Text>

          <Text className="mt-1 text-xs font-semibold text-gray-400">
            Manage Blood Care modules
          </Text>

          <View className="mt-4 flex-row flex-wrap justify-between">
            <ManagementCard
              title="Users"
              subtitle="Manage accounts"
              icon="people-outline"
              iconColor="#E11D48"
              background="#FFE4E6"
              delay={0}
              onPress={() =>
                router.push(
                  "/admin/users" as any
                )
              }
            />

            <ManagementCard
              title="Donors"
              subtitle="Donor directory"
              icon="heart-outline"
              iconColor="#EA580C"
              background="#FFEDD5"
              delay={70}
              onPress={() =>
                router.push(
                  "/admin/donors" as any
                )
              }
            />

            <ManagementCard
              title="Requests"
              subtitle="Blood requests"
              icon="water-outline"
              iconColor="#2563EB"
              background="#DBEAFE"
              delay={140}
              onPress={() =>
                router.push(
                  "/admin/requests" as any
                )
              }
            />

            <ManagementCard
              title="Emergency"
              subtitle="Critical alerts"
              icon="warning-outline"
              iconColor="#DC2626"
              background="#FEE2E2"
              delay={210}
              onPress={() =>
                router.push(
                  "/admin/emergencies" as any
                )
              }
            />

            <ManagementCard
              title="Blood Bank"
              subtitle="Reserve stock"
              icon="flask-outline"
              iconColor="#0891B2"
              background="#CFFAFE"
              delay={245}
              onPress={() =>
                router.push(
                  "/admin/inventory" as any
                )
              }
            />

            <ManagementCard
              title="Notifications"
              subtitle="Announcements"
              icon="notifications-outline"
              iconColor="#9333EA"
              background="#F3E8FF"
              delay={280}
              onPress={() =>
                router.push(
                  "/admin/notifications" as any
                )
              }
            />

            <ManagementCard
              title="Reports"
              subtitle="Analytics"
              icon="bar-chart-outline"
              iconColor="#16A34A"
              background="#DCFCE7"
              delay={350}
              onPress={() =>
                router.push(
                  "/admin/reports" as any
                )
              }
            />

            <ManagementCard
              title="Profile"
              subtitle="Admin account & settings"
              icon="person-circle-outline"
              iconColor="#475569"
              background="#F1F5F9"
              delay={420}
              fullWidth
              onPress={() =>
                router.push(
                  "/admin/profile" as any
                )
              }
            />
          </View>
        </Animated.View>

        {/* ==================================================
            RECENT ACTIVITY
        ================================================== */}

        <Animated.View
          style={fadeUp(activityAnim)}
          className="px-4 pt-6"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-black text-gray-950">
                Recent Activity
              </Text>

              <Text className="mt-1 text-[11px] font-semibold text-gray-400">
                Latest requests and emergencies
              </Text>
            </View>

            <TouchableOpacity
              onPress={onRefresh}
              className="h-10 w-10 items-center justify-center rounded-full bg-red-50"
            >
              <Ionicons
                name="refresh"
                size={18}
                color="#E11D2E"
              />
            </TouchableOpacity>
          </View>

          <View className="mt-4 overflow-hidden rounded-[28px] border border-gray-100 bg-white">
            {recentActivities.length ===
            0 ? (
              <View className="items-center py-10">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                  <Ionicons
                    name="time-outline"
                    size={30}
                    color="#CBD5E1"
                  />
                </View>

                <Text className="mt-3 text-sm font-black text-gray-500">
                  No recent activity
                </Text>
              </View>
            ) : (
              recentActivities.map(
                (
                  activity,
                  index
                ) => (
                  <ActivityItem
                    key={
                      activity.id
                    }
                    activity={
                      activity
                    }
                    index={index}
                    last={
                      index ===
                      recentActivities.length -
                        1
                    }
                  />
                )
              )
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ======================================================
// QUICK OVERVIEW CARD
// ======================================================

const MiniStatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  bottomColor,
  delay,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  iconColor: string;
  iconBackground: string;
  bottomColor: string;
  delay: number;
}) => {
  const animation = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 450,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: animation,

        transform: [
          {
            translateY:
              animation.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 0],
              }),
          },
        ],
      }}
      className="mb-3 w-[31.5%] overflow-hidden rounded-[22px] border border-gray-100 bg-white px-3 pb-4 pt-3 shadow-sm"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            iconBackground,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <Text className="mt-3 text-[25px] font-black text-gray-950">
        {value}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-1 text-[9px] font-black uppercase tracking-wider text-gray-600"
      >
        {title}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-1 text-[9px] font-medium text-gray-400"
      >
        {subtitle}
      </Text>

      <View
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{
          backgroundColor:
            bottomColor,
        }}
      />
    </Animated.View>
  );
};

// ======================================================
// MANAGEMENT CARD
// ======================================================

const ManagementCard = ({
  title,
  subtitle,
  icon,
  iconColor,
  background,
  onPress,
  fullWidth = false,
  delay,
}: {
  title: string;
  subtitle: string;
  icon: any;
  iconColor: string;
  background: string;
  onPress: () => void;
  fullWidth?: boolean;
  delay: number;
}) => {
  const entryAnim = useRef(
    new Animated.Value(0)
  ).current;

  const scaleAnim = useRef(
    new Animated.Value(1)
  ).current;

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const pressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: entryAnim,

        transform: [
          {
            translateY:
              entryAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 0],
              }),
          },
          {
            scale: scaleAnim,
          },
        ],
      }}
      className={
        fullWidth
          ? "mb-3 w-full"
          : "mb-3 w-[48%]"
      }
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm"
      >
        <View className="flex-row items-start justify-between">
          <View
            className="h-12 w-12 items-center justify-center rounded-[18px]"
            style={{
              backgroundColor:
                background,
            }}
          >
            <Ionicons
              name={icon}
              size={22}
              color={iconColor}
            />
          </View>

          <Ionicons
            name="arrow-forward-circle-outline"
            size={22}
            color="#CBD5E1"
          />
        </View>

        <Text className="mt-4 text-sm font-black text-gray-900">
          {title}
        </Text>

        <Text className="mt-1 text-[10px] font-semibold text-gray-400">
          {subtitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ======================================================
// ACTIVITY ITEM
// ======================================================

const ActivityItem = ({
  activity,
  last,
  index,
}: {
  activity: RecentActivity;
  last: boolean;
  index: number;
}) => {
  const animation = useRef(
    new Animated.Value(0)
  ).current;

  const emergency =
    activity.type ===
    "emergency";

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 400,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: animation,

        transform: [
          {
            translateX:
              animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
          },
        ],
      }}
      className={`flex-row items-center px-5 py-5 ${
        !last
          ? "border-b border-gray-100"
          : ""
      }`}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-[16px]"
        style={{
          backgroundColor:
            emergency
              ? "#FEE2E2"
              : "#DBEAFE",
        }}
      >
        <Ionicons
          name={
            emergency
              ? "warning-outline"
              : "water-outline"
          }
          size={20}
          color={
            emergency
              ? "#DC2626"
              : "#2563EB"
          }
        />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-sm font-black text-gray-900">
          {activity.title}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-1 text-[11px] font-semibold leading-5 text-gray-400"
        >
          {activity.description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#D1D5DB"
      />
    </Animated.View>
  );
};

export default AdminDashboard;
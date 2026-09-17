import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";

import {ScrollView,StatusBar,Text,TouchableOpacity,View,} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../../config/backendConfig";
import {collection,onSnapshot,query,where,} from "@/src/lib/backendCompat";

import { useUserStore } from "../../../store/userStore";
import { useImpactStats } from "../../../hooks/home/useImpactStats";

// NEW - GPS LOCATION SERVICE
import { saveCurrentLocation } from "../../../utils/locationService";

const Home = () => {
  const router = useRouter();

  const {
    user: userData,
    loading,
  } = useUserStore();

  const impactStats = useImpactStats();

  // ======================================================
  // SAVE USER GPS LOCATION
  // ======================================================

  React.useEffect(() => {
    if (
      loading ||
      !auth.currentUser?.uid
    ) {
      return;
    }

    const saveLocation = async () => {
      const success =
        await saveCurrentLocation();

      if (success) {
        console.log(
          "User GPS location updated successfully."
        );
      } else {
        console.log(
          "User GPS location was not updated."
        );
      }
    };

    saveLocation();
  }, [loading]);

  // ======================================================
  // DONATION STATUS
  // ======================================================

  const getDonationStatus = () => {
    if (
      !userData ||
      userData.availableToDonate !== false
    ) {
      return {
        isEligible: true,
        timeLeft: "",
      };
    }

    const lastDonationDate =
      userData.lastDonationDate?.toDate() ||
      new Date();

    const nextDonationDate =
      new Date(lastDonationDate);

    nextDonationDate.setMonth(
      nextDonationDate.getMonth() + 3
    );

    const now = new Date();

    const diffTime =
      nextDonationDate.getTime() -
      now.getTime();

    if (diffTime <= 0) {
      return {
        isEligible: true,
        timeLeft: "",
      };
    }

    const diffDaysTotal = Math.ceil(
      diffTime /
        (1000 * 60 * 60 * 24)
    );

    const months = Math.floor(
      diffDaysTotal / 30
    );

    const days =
      diffDaysTotal % 30;

    let timeLeft = "";

    if (months > 0) {
      timeLeft += `${months} month${
        months > 1 ? "s" : ""
      } `;
    }

    if (days > 0) {
      timeLeft += `${days} day${
        days > 1 ? "s" : ""
      } `;
    }

    return {
      isEligible: false,
      timeLeft:
        timeLeft.trim() +
        " left",
    };
  };

  const donationStatus =
    getDonationStatus();

  // ======================================================
  // NOTIFICATION COUNT
  // ======================================================

  const [
    unreadCount,
    setUnreadCount,
  ] = React.useState(0);

  React.useEffect(() => {
    const userId =
      auth.currentUser?.uid;

    if (!userId) {
      return;
    }

    let privateSize = 0;
    let communitySize = 0;

    const updateTotalCount = (
      size: number,
      type:
        | "private"
        | "community"
    ) => {
      if (
        type === "private"
      ) {
        privateSize = size;
      } else {
        communitySize = size;
      }

      setUnreadCount(
        privateSize +
          communitySize
      );
    };

    // ==================================================
    // PRIVATE NOTIFICATIONS
    // ==================================================

    const privateQuery = query(
      collection(
        db,
        "notifications"
      ),

      where(
        "userId",
        "==",
        userId
      ),

      where(
        "unread",
        "==",
        true
      )
    );

    // ==================================================
    // COMMUNITY NOTIFICATIONS
    // ==================================================

    const communityQuery =
      query(
        collection(
          db,
          "community_notifications"
        ),

        where(
          "unread",
          "==",
          true
        )
      );

    const unsubPrivate =
      onSnapshot(
        privateQuery,
        (snapshot : any) => {
          updateTotalCount(
            snapshot.size,
            "private"
          );
        }
      );

    const unsubCommunity =
      onSnapshot(
        communityQuery,
        (snapshot : any) => {
          // Only count notifications actually relevant/
          // visible to this user — same rule the
          // notifications screen uses — so the dot goes
          // away once THIS user's visible notifications
          // are all read, instead of counting everyone
          // else's too.
          const relevantCount =
            snapshot.docs.filter(
              (docSnap : any) => {
                const item =
                  docSnap.data();

                if (
                  item.type ===
                  "emergency_response"
                ) {
                  return (
                    item.userId ===
                      userId ||
                    item.reporterUid ===
                      userId
                  );
                }

                if (
                  item.type ===
                    "emergency" &&
                  item.bloodSource ===
                    "Blood Bank Reserve"
                ) {
                  return (
                    item.reporterUid !==
                    userId
                  );
                }

                if (
                  item.type === "emergency"
                ) {
                  return (
                    item.reporterUid !==
                    userId
                  );
                }

                if (item.type === "request") {
                  return (
                    item.reporterUid !==
                    userId
                  );
                }

                return true;
              }
            ).length;

          updateTotalCount(
            relevantCount,
            "community"
          );
        }
      );

    return () => {
      unsubPrivate();
      unsubCommunity();
    };
  }, []);

  // ======================================================
  // UI
  // ======================================================

  return (
    <SafeAreaView
      className="flex-1 bg-[#F5F7FA]"
      edges={["top"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        {/* ==================================================
            TOP HEADER
        ================================================== */}

        <View className="mt-4 flex-row items-center justify-between px-6">
          <View className="flex-1 pr-4">
            <Text
              numberOfLines={1}
              className="text-3xl font-black tracking-tight text-gray-900"
            >
              Hello,{" "}
              {(
                userData?.fullName ||
                "Guest"
              ).split(" ")[0]}
              👋
            </Text>

            <Text className="mt-0.5 text-sm font-medium text-gray-400">
              Together we can save more lives
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push(
                "/(tabs)/home/notification"
              )
            }
            activeOpacity={0.8}
            className="relative h-12 w-12 items-center justify-center rounded-2xl border border-gray-300 bg-gray-50 shadow-sm"
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#1F2937"
            />

            {unreadCount > 0 && (
              <View className="absolute right-[11px] top-[11px] h-2.5 w-2.5 rounded-full border-[1.5px] border-gray-50 bg-red-500" />
            )}
          </TouchableOpacity>
        </View>

        {/* ==================================================
            DONATION STATUS
        ================================================== */}

        <View className="mt-6 px-6">
          <TouchableOpacity
            activeOpacity={0.9}
            className={`overflow-hidden rounded-3xl p-6 shadow-xl ${
              donationStatus.isEligible
                ? "bg-red-600 shadow-red-200"
                : "bg-gray-800 shadow-gray-200"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <View className="mb-3 self-start rounded-full bg-white/20 px-3 py-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-white">
                    {donationStatus.isEligible
                      ? "Ready to Donate"
                      : "Donation Gap"}
                  </Text>
                </View>

                <Text className="text-2xl font-black leading-tight text-white">
                  {donationStatus.isEligible
                    ? "Save a Life\nToday"
                    : "Next Donation\nPeriod"}
                </Text>

                <Text className="mt-2 text-xs font-medium leading-5 text-white/80">
                  {donationStatus.isEligible
                    ? "Find blood donation camps near your current location."
                    : `You've recently donated! You can donate again in ${donationStatus.timeLeft}.`}
                </Text>

                {donationStatus.isEligible ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="mt-4 flex-row items-center self-start rounded-xl bg-white px-4 py-2"
                  >
                    <Text className="text-[11px] font-black uppercase tracking-wider text-red-600">
                      Discover Now
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color="#DC2626"
                      style={{
                        marginLeft: 4,
                      }}
                    />
                  </TouchableOpacity>
                ) : (
                  <View className="mt-4 flex-row items-center self-start rounded-xl bg-white/10 px-4 py-2">
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color="white"
                    />

                    <Text className="ml-2 text-[11px] font-black uppercase tracking-wider text-white">
                      {
                        donationStatus.timeLeft
                      }
                    </Text>
                  </View>
                )}
              </View>

              <View className="relative">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-white/10">
                  <Ionicons
                    name={
                      donationStatus.isEligible
                        ? "heart"
                        : "calendar"
                    }
                    size={60}
                    color="white"
                  />
                </View>

                {donationStatus.isEligible && (
                  <Ionicons
                    name="navigate-circle"
                    size={40}
                    color="white"
                    style={{
                      position:
                        "absolute",
                      bottom: -5,
                      right: -5,
                    }}
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <Text className="mt-6 px-6 text-xl font-black text-gray-900">
          Quick Actions
        </Text>

        <View className="flex-row justify-between gap-4 px-6 py-4">
          <ActionCard
            title="Blood Request"
            icon="water-outline"
            color="bg-red-500"
            bgColor="bg-red-50"
            onPress={() =>
              router.push(
                "/(tabs)/home/requests"
              )
            }
          />

          <ActionCard
            title="Emergency"
            icon="warning-outline"
            color="bg-orange-500"
            bgColor="bg-orange-50"
            onPress={() =>
              router.push(
                "/(tabs)/home/emergency"
              )
            }
          />
        </View>

        {/* ==================================================
            IMPACT
        ================================================== */}

        <View className="flex-row items-center justify-between px-6">
          <Text className="text-xl font-black text-gray-900">
            Your Impact!
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between px-6 pt-4 pb-12">
          <StatCard
            value={impactStats.donations}
            label="Donations"
            icon="heart-outline"
            color="text-red-600"
            bgColor="bg-red-50"
          />

          <StatCard
            value={impactStats.livesSaved}
            label="Lives Saved"
            icon="shield-checkmark-outline"
            color="text-green-600"
            bgColor="bg-green-50"
          />

          <StatCard
            value={impactStats.bloodDonors}
            label="Blood Donors"
            icon="people-outline"
            color="text-blue-600"
            bgColor="bg-blue-50"
          />

          <StatCard
            value={`${impactStats.donatedMl}ml`}
            label="Donated"
            icon="water-outline"
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ======================================================
// ACTION CARD
// ======================================================

const ActionCard = ({
  title,
  icon,
  color,
  bgColor,
  onPress,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-1 items-center justify-center rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
  >
    <View
      className={`mb-3 h-14 w-14 items-center justify-center rounded-2xl ${bgColor}`}
    >
      <Ionicons
        name={icon}
        size={28}
        color={
          color.includes("orange")
            ? "#F97316"
            : color.includes("blue")
              ? "#3B82F6"
              : "#DC2626"
        }
      />
    </View>

    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      className="text-center text-sm font-black text-gray-800"
    >
      {title}
    </Text>
  </TouchableOpacity>
);

// ======================================================
// STAT CARD
// ======================================================

const StatCard = ({
  value,
  label,
  icon,
  color,
  bgColor,
}: any) => (
  <View className="mb-4 w-[48%] items-center rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
    <View
      className={`mb-3 h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          color.includes("red")
            ? "#DC2626"
            : color.includes(
                  "green"
                )
              ? "#16A34A"
              : color.includes(
                    "blue"
                  )
                ? "#2563EB"
                : "#9333EA"
        }
      />
    </View>

    <Text
      className={`text-2xl font-black ${color}`}
    >
      {value}
    </Text>

    <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
      {label}
    </Text>
  </View>
);

export default Home;
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
    <SafeAreaView className="flex-1 bg-[#F5F6FA]" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 125 }}
      >
        {/* HEADER */}
        <View className="mt-5 flex-row items-center justify-between px-5">
          <View className="flex-1 pr-3">
            <Text numberOfLines={1} className="text-[26px] font-black tracking-tight text-[#101827]">
              {userData?.fullName?.trim() || "Guest"} 👋
            </Text>
            <Text className="mt-1 text-[13px] font-medium text-[#6B7280]">
              Together we can save more lives
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/home/notification")}
            activeOpacity={0.8}
            className="relative h-[49px] w-[49px] items-center justify-center rounded-[17px] border border-[#E8E9EC] bg-white"
            style={cardShadow}
          >
            <Ionicons name="notifications-outline" size={25} color="#D91F2B" />
            {unreadCount > 0 && (
              <View className="absolute right-[10px] top-[9px] h-[9px] w-[9px] rounded-full border border-white bg-red-600" />
            )}
          </TouchableOpacity>
        </View>

        {/* DONATION BANNER */}
        <View className="mt-7 px-5">
          <View
            className="overflow-hidden rounded-[25px] bg-[#E52225] px-[23px] pb-[23px] pt-[23px]"
            style={{ ...cardShadow, shadowColor: "#E52225", shadowOpacity: 0.18, elevation: 5 }}
          >
            <View className="self-start rounded-full bg-white/20 px-4 py-[7px]">
              <Text className="text-[11px] font-black uppercase tracking-wider text-white">
                {donationStatus.isEligible ? "Ready to Donate" : "Donation Gap"}
              </Text>
            </View>
            <View className="mt-[15px] flex-row items-center">
              <View className="flex-1 pr-2">
                <Text className="text-[27px] font-black leading-[35px] text-white">
                  {donationStatus.isEligible ? "Save a Life\nToday" : "Next Donation\nPeriod"}
                </Text>
                <Text className="mt-3 text-[13px] font-medium leading-[21px] text-white/90">
                  {donationStatus.isEligible
                    ? "Find blood donation camps near your current location."
                    : `You've recently donated! You can donate again in ${donationStatus.timeLeft}.`}
                </Text>
              </View>
              <View className="relative h-[103px] w-[103px] items-center justify-center rounded-full bg-white/10">
                <Ionicons name={donationStatus.isEligible ? "heart" : "calendar"} size={67} color="#FFFFFF" />
                {donationStatus.isEligible && (
                  <View className="absolute -bottom-2 -right-1 h-[43px] w-[43px] items-center justify-center rounded-full bg-white">
                    <Ionicons name="navigate" size={24} color="#E52225" />
                  </View>
                )}
              </View>
            </View>
            {donationStatus.isEligible ? (
              <View className="mt-[18px] self-start flex-row items-center rounded-[13px] bg-white px-[17px] py-[11px]">
                <Text className="text-[12px] font-black uppercase tracking-wide text-[#C91D25]">Discover Now</Text>
                <Ionicons name="arrow-forward" size={18} color="#C91D25" style={{ marginLeft: 8 }} />
              </View>
            ) : (
              <View className="mt-[18px] self-start flex-row items-center rounded-xl bg-white/20 px-4 py-3">
                <Ionicons name="time-outline" size={15} color="white" />
                <Text className="ml-2 text-[12px] font-bold text-white">{donationStatus.timeLeft}</Text>
              </View>
            )}
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text className="mt-8 px-5 text-[21px] font-black text-[#111827]">Quick Actions</Text>
        <View className="mt-4 flex-row gap-4 px-5">
          <ActionCard
            title="Blood Request"
            icon="water-outline"
            iconColor="#D91F2B"
            iconBackground="#FFF0F1"
            onPress={() => router.push("/(tabs)/home/requests")}
          />
          <ActionCard
            title="Emergency"
            icon="warning-outline"
            iconColor="#F59E0B"
            iconBackground="#FFF7E6"
            onPress={() => router.push("/(tabs)/home/emergency")}
          />
        </View>

        {/* IMPACT */}
        <Text className="mt-8 px-5 text-[21px] font-black text-[#111827]">Your Impact!</Text>
        <View className="mt-4 flex-row flex-wrap justify-between px-5">
          <StatCard value={impactStats.donations} label="Donations" icon="heart-outline" iconColor="#E11D48" iconBackground="#FFF0F3" />
          <StatCard value={impactStats.livesSaved} label="Lives Saved" icon="shield-checkmark-outline" iconColor="#16A34A" iconBackground="#EAFBF0" />
          <StatCard value={impactStats.bloodDonors} label="Blood Donors" icon="people-outline" iconColor="#2563EB" iconBackground="#EFF6FF" />
          <StatCard value={`${impactStats.donatedMl}ml`} label="Donated" icon="water-outline" iconColor="#9333EA" iconBackground="#F5F0FF" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const cardShadow = {
  shadowColor: "#111827",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const ActionCard = ({ title, icon, iconColor, iconBackground, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className="h-[139px] flex-1 items-center justify-center rounded-[24px] border border-[#E5E7EB] bg-white px-2"
    style={cardShadow}
  >
    <View className="mb-3 h-[58px] w-[58px] items-center justify-center rounded-[17px]" style={{ backgroundColor: iconBackground }}>
      <Ionicons name={icon} size={30} color={iconColor} />
    </View>
    <Text numberOfLines={1} className="text-center text-[14px] font-extrabold text-[#111827]">{title}</Text>
  </TouchableOpacity>
);

const StatCard = ({ value, label, icon, iconColor, iconBackground }: any) => (
  <View
    className="mb-4 w-[48.5%] items-center rounded-[24px] border border-[#E5E7EB] bg-white px-2 py-[20px]"
    style={cardShadow}
  >
    <View className="mb-3 h-[45px] w-[45px] items-center justify-center rounded-[14px]" style={{ backgroundColor: iconBackground }}>
      <Ionicons name={icon} size={24} color={iconColor} />
    </View>
    <Text className="text-[25px] font-black" style={{ color: iconColor }}>{value}</Text>
    <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8B94A2]">{label}</Text>
  </View>
);

export default Home;

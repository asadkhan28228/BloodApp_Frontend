
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Avatar from "./Avatar";

interface DonorCardProps {
  fullName: string;
  bloodType: string;
  location: string;
  distance?: number | string | null;
  latitude?: number | null;
  longitude?: number | null;
  donationsCount?: number | string;
  rating?: number | string;
  isAvailable?: boolean;
  avatarUrl?: string;
  gender?: string;
  onCallPress?: () => void;
  onMessagePress?: () => void;
  onPress?: () => void;
  onMapPress?: () => void;
}

const RED = "#E50914";

const Donorcard: React.FC<DonorCardProps> = ({
  fullName,
  bloodType,
  location,
  distance,
  donationsCount = 0,
  isAvailable = true,
  avatarUrl,
  onCallPress,
  onMessagePress,
  onPress,
}) => {
  const numericDistance = Number(distance);

  const distanceText =
    distance === null ||
    distance === undefined ||
    distance === "" ||
    !Number.isFinite(numericDistance)
      ? null
      : `${numericDistance.toFixed(1)} km away`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mx-[14px] mb-[8px] rounded-[18px] border border-[#E9EAEE] bg-white"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View className="px-[11px] pb-[9px] pt-[11px]">

        {/* MAIN CONTENT */}
        <View className="flex-row items-start">

          {/* AVATAR */}
          <View className="mr-[9px]">
            <Avatar
              name={fullName}
              photoUrl={avatarUrl}
              size={46}
            />
          </View>

          {/* DONOR DETAILS */}
          <View className="min-w-0 flex-1 pt-[1px]">

            {/* NAME */}
            <Text
              numberOfLines={1}
              className="text-[13px] font-black text-[#101827]"
            >
              {fullName}
            </Text>

            {/* LOCATION */}
            <View className="mt-[2px] flex-row items-center">
              <Ionicons
                name="location-outline"
                size={12}
                color="#8590A0"
              />

              <Text
                numberOfLines={1}
                className="ml-[3px] flex-1 text-[10px] font-medium text-[#5D6675]"
              >
                {location || "Location unavailable"}
              </Text>
            </View>

            {/* BLOOD GROUP + DONATIONS */}
            <View className="mt-[6px] flex-row items-center">

              {/* BLOOD BADGE */}
              <View className="flex-row items-center rounded-[8px] bg-[#FFF0F1] px-[6px] py-[4px]">
                <Ionicons
                  name="water"
                  size={11}
                  color={RED}
                />

                <Text
                  className="ml-[2px] text-[10px] font-extrabold"
                  style={{ color: RED }}
                >
                  {bloodType}
                </Text>
              </View>

              {/* DIVIDER */}
              <View className="mx-[6px] h-[19px] w-px bg-[#E5E7EB]" />

              {/* DONATIONS */}
              <View className="flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color="#8590A0"
                />

                <View className="ml-[3px]">
                  <Text className="text-[10px] font-extrabold leading-[12px] text-[#111827]">
                    {donationsCount}
                  </Text>

                  <Text className="text-[8px] leading-[10px] text-[#758091]">
                    Donations
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* CALL AND MESSAGE BUTTONS */}
          <View className="ml-[5px] w-[76px]">

            {/* CALL */}
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                onCallPress?.();
              }}
              activeOpacity={0.8}
              className="h-[34px] flex-row items-center justify-center rounded-[10px]"
              style={{
                backgroundColor: RED,
                elevation: 2,
              }}
            >
              <Ionicons
                name="call"
                size={13}
                color="#FFFFFF"
              />

              <Text className="ml-[4px] text-[11px] font-extrabold text-white">
                Call
              </Text>
            </TouchableOpacity>

            {/* MESSAGE */}
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                onMessagePress?.();
              }}
              activeOpacity={0.8}
              className="mt-[6px] h-[28px] flex-row items-center justify-center rounded-[9px] bg-[#FFF0F1]"
            >
              <Ionicons
                name="chatbubble-outline"
                size={11}
                color="#C81020"
              />

              <Text className="ml-[3px] text-[9px] font-bold text-[#B91C2B]">
                Message
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DISTANCE - ONLY IF AVAILABLE */}
        {distanceText && (
          <View className="mt-[6px] self-start rounded-full bg-orange-50 px-[8px] py-[3px]">
            <Text className="text-[9px] font-bold text-orange-600">
              {distanceText}
            </Text>
          </View>
        )}

        {/* AVAILABILITY BADGE */}
        <View className="mt-[7px] self-start flex-row items-center rounded-full bg-[#E8FFF0] px-[8px] py-[4px]">
          <View
            className="h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: isAvailable
                ? "#16C75C"
                : "#9CA3AF",
            }}
          />

          <Text
            className="ml-[4px] text-[9px] font-extrabold"
            style={{
              color: isAvailable
                ? "#129447"
                : "#6B7280",
            }}
          >
            {isAvailable
              ? "Available now"
              : "Currently unavailable"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default Donorcard;

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

const Donorcard: React.FC<DonorCardProps> = ({
  fullName,
  bloodType,
  location,
  distance,
  donationsCount = "0",
  isAvailable = true,
  avatarUrl,
  onCallPress,
  onMessagePress,
  onPress,
}) => {
  const distanceText =
    distance === null ||
    distance === undefined ||
    distance === ""
      ? null
      : `${Number(distance).toFixed(1)} km away`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="mx-4 mb-3 overflow-hidden rounded-[22px] border border-gray-100 bg-white"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.05,
        shadowRadius: 7,
        elevation: 2,
      }}
    >
      <View className="p-4">
        <View className="flex-row items-start">

          {/* =========================
              AVATAR
          ========================= */}

          <View className="mr-3">
            <Avatar
              name={fullName}
              photoUrl={avatarUrl}
              size={60}
            />
          </View>

          {/* =========================
              DONOR DETAILS
          ========================= */}

          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-[16px] font-black text-gray-900"
            >
              {fullName}
            </Text>

            {/* Location */}

            <View className="mt-1 flex-row items-center">
              <Ionicons
                name="location-outline"
                size={14}
                color="#9CA3AF"
              />

              <Text
                numberOfLines={1}
                className="ml-1 flex-1 text-[12px] font-medium text-gray-500"
              >
                {location || "Location unavailable"}
              </Text>
            </View>

            {/* Blood + Donations */}

            <View className="mt-2.5 flex-row items-center">

              <View className="flex-row items-center">
                <Ionicons
                  name="water"
                  size={14}
                  color="#DC2626"
                />

                <Text className="ml-1 text-[12px] font-black text-red-600">
                  {bloodType}
                </Text>
              </View>

              <View className="mx-3 h-4 w-px bg-gray-200" />

              <View className="flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="#6B7280"
                />

                <View className="ml-1">
                  <Text className="text-[11px] font-black leading-3.5 text-gray-800">
                    {donationsCount}
                  </Text>

                  <Text className="text-[9px] font-medium leading-3 text-gray-500">
                    Donations
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* =========================
              CALL BUTTON
          ========================= */}

          <View className="ml-2 items-end">
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                onCallPress?.();
              }}
              activeOpacity={0.8}
              className="h-[42px] min-w-[86px] flex-row items-center justify-center rounded-xl bg-red-600 px-3"
              style={{
                shadowColor: "#DC2626",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <Ionicons
                name="call"
                size={17}
                color="#FFFFFF"
              />

              <Text className="ml-1.5 text-[13px] font-extrabold text-white">
                Call
              </Text>
            </TouchableOpacity>

            {onMessagePress && (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  onMessagePress?.();
                }}
                activeOpacity={0.7}
                className="mt-2 flex-row items-center"
              >
                <Ionicons
                  name="chatbox-outline"
                  size={14}
                  color="#DC2626"
                />

                <Text className="ml-1 text-[10px] font-bold text-red-600">
                  Message
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* =========================
            DISTANCE
        ========================= */}

        {distanceText && (
          <View className="mt-2 self-start rounded-full bg-orange-50 px-2.5 py-1">
            <Text className="text-[9px] font-extrabold text-orange-600">
              {distanceText}
            </Text>
          </View>
        )}

        {/* =========================
            AVAILABILITY
        ========================= */}

        <View className="mt-3 flex-row items-center">
          <View
            className={`h-2 w-2 rounded-full ${
              isAvailable
                ? "bg-green-500"
                : "bg-gray-400"
            }`}
          />

          <Text
            className={`ml-1.5 text-[11px] font-bold ${
              isAvailable
                ? "text-green-600"
                : "text-gray-500"
            }`}
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
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
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
  latitude,
  longitude,
  donationsCount = "0",
  isAvailable = true,
  avatarUrl,
  gender,
  onCallPress,
  onMessagePress,
  onPress,
  onMapPress,
}) => {
  const distanceText =
    distance === null || distance === undefined || distance === ""
      ? null
      : `${Number(distance).toFixed(1)} km away`;

  return (
    <View className="mx-4 mb-4 rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="p-4 flex-row items-center"
      >
        {/* Profile Avatar & Blood Type */}
        <View className="relative">
          <Avatar
            name={fullName}
            photoUrl={avatarUrl}
            size={64}
          />
          <View className="absolute -bottom-2 -right-2 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-sm">
            <Text className="text-[10px] font-black text-white">
              {bloodType}
            </Text>
          </View>
        </View>

        {/* Donor Details */}
        <View className="ml-5 flex-1 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center">
              <Text
                numberOfLines={1}
                className="text-lg font-black text-gray-900"
              >
                {fullName}
              </Text>

              {Number(donationsCount) >= 5 && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color="#2563EB"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <View className="mt-2 flex-row items-center">
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text
                numberOfLines={1}
                className="ml-1 text-xs font-semibold text-gray-400 flex-1"
              >
                {location || "Location unavailable"}
              </Text>
            </View>

            {distanceText && (
              <View className="mt-2 self-start rounded-full bg-orange-100 px-2.5 py-1">
                <Text className="text-[10px] font-black uppercase tracking-wider text-orange-700">
                  {distanceText}
                </Text>
              </View>
            )}

            <View className="mt-2 flex-row items-center">
              <View className="flex-row items-center rounded-full bg-red-50 px-2 py-0.5">
                <Ionicons name="water" size={10} color="#DC2626" />
                <Text className="ml-1 text-[10px] font-black text-red-600">
                  {donationsCount} donations
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column: Status & Action Buttons */}
          <View className="items-center">
            <View
              className={`mb-1.5 flex-row items-center rounded-full px-2 py-1 ${
                isAvailable ? "bg-green-50" : "bg-gray-100"
              }`}
            >
              <View
                className={`h-1.5 w-1.5 rounded-full ${
                  isAvailable ? "bg-green-500" : "bg-gray-400"
                } mr-1`}
              />
              <Text
                className={`text-[8px] font-black ${
                  isAvailable ? "text-green-600" : "text-gray-400"
                } uppercase`}
              >
                {isAvailable ? "Available" : "Busy"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onCallPress}
              activeOpacity={0.7}
              className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200"
            >
              <Ionicons name="call" size={18} color="red" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default Donorcard;

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Avatar from "./Avatar";

interface BloodRequestCardProps {
  patientName: string;
  bloodType: string;
  location: string;
  timeAgo: string;
  isUrgent?: boolean;
  avatarUrl?: string;
  gender?: string;
  onCallPress?: () => void;
  onPress?: () => void;
  units?: number | string;
  status?: string;
  reporterName?: string;
  avatarName?: string;
  showCallButton?: boolean;
  bare?: boolean;
}

const BloodRequestCard: React.FC<BloodRequestCardProps> = ({
  patientName,
  bloodType,
  location,
  timeAgo,
  isUrgent = false,
  avatarUrl,
  onCallPress,
  onPress,
  units,
  avatarName,
  showCallButton = true,
  bare = false,
}) => {
  const unitCount =
    units && Number(units) > 0
      ? Number(units)
      : 1;

  const unitText =
    unitCount === 1
      ? "1 Unit"
      : `${unitCount} Units`;

  const accentColor = isUrgent
    ? "#FF2D63"
    : "#1687F8";

  const badgeBackground = isUrgent
    ? "#FFE8EE"
    : "#E8F2FF";

  const content = (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
      className="overflow-hidden rounded-[22px] bg-white"
    >
      <View className="flex-row">

        {/* LEFT COLORED LINE */}
        <View
          style={{
            width: 5,
            backgroundColor: accentColor,
          }}
        />

        {/* CARD BODY */}
        <View className="min-h-[118px] flex-1 flex-row items-center px-[12px] py-[11px]">

          {/* =========================
              AVATAR
          ========================= */}
          <View className="relative mr-[13px]">

            <View
              className="
                h-[72px]
                w-[72px]
                items-center
                justify-center
                overflow-hidden
                rounded-[18px]
                bg-[#F1F4FF]
              "
            >
              <Avatar
                name={avatarName || patientName}
                photoUrl={avatarUrl}
                size={72}
              />
            </View>

            {/* BLOOD TYPE BADGE */}
            <View
              className="
                absolute
                -bottom-[7px]
                -right-[7px]
                h-[34px]
                min-w-[34px]
                items-center
                justify-center
                rounded-full
                border-[3px]
                border-white
                bg-[#D90429]
                px-[4px]
              "
              style={{
                shadowColor: "#D90429",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.18,
                shadowRadius: 3,
                elevation: 3,
              }}
            >
              <Text className="text-[9px] font-black text-white">
                {bloodType}
              </Text>
            </View>
          </View>

          {/* =========================
              CENTER
          ========================= */}
          <View className="min-w-0 flex-1 justify-center">

            {/* PATIENT NAME */}
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="
                text-[17px]
                font-black
                leading-[21px]
                text-[#0F172A]
              "
            >
              {patientName}
            </Text>

            {/* LOCATION */}
            <View className="mt-[8px] flex-row items-center">

              <Ionicons
                name="location"
                size={16}
                color="#E11D48"
              />

              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="
                  ml-[7px]
                  flex-1
                  text-[12px]
                  font-medium
                  text-[#475569]
                "
              >
                {location}
              </Text>
            </View>

            {/* TIME */}
            <View className="mt-[8px] flex-row items-center">

              <Ionicons
                name="time-outline"
                size={16}
                color="#8B929C"
              />

              <Text
                numberOfLines={1}
                className="
                  ml-[7px]
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.3px]
                  text-[#7C828D]
                "
              >
                {timeAgo}
              </Text>
            </View>
          </View>

          {/* =========================
              RIGHT SIDE
          ========================= */}
          <View className="ml-[5px] w-[70px] items-center justify-center">

            {/* UNIT */}
            <Text
              numberOfLines={1}
              className="
                text-[11px]
                font-black
                text-[#1E293B]
              "
            >
              {unitText}
            </Text>

            {/* NORMAL / URGENT */}
            <View
              className="
                mt-[7px]
                h-[31px]
                w-[70px]
                flex-row
                items-center
                justify-center
                rounded-full
              "
              style={{
                backgroundColor: badgeBackground,
              }}
            >
              <Ionicons
                name="water"
                size={14}
                color={accentColor}
              />

              <Text
                className="
                  ml-[4px]
                  text-[9px]
                  font-black
                "
                style={{
                  color: accentColor,
                }}
              >
                {isUrgent ? "Urgent" : "Normal"}
              </Text>
            </View>

            {/* CALL BUTTON */}
            {showCallButton && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={(event) => {
                  event.stopPropagation();
                  onCallPress?.();
                }}
                className="
                  mt-[7px]
                  h-[38px]
                  w-[38px]
                  items-center
                  justify-center
                  rounded-full
                  bg-[#FFECEF]
                "
              >
                <Ionicons
                  name="call"
                  size={18}
                  color="#E11D48"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (bare) {
    return content;
  }

  return (
    <View
      className="
        mb-[12px]
        overflow-hidden
        rounded-[22px]
        border
        border-[#F1F5F9]
        bg-white
      "
      style={{
        shadowColor: "#64748B",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.09,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {content}
    </View>
  );
};

export default BloodRequestCard;
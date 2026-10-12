import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
  const parsedUnits = Number(units);
  const unitCount = Number.isFinite(parsedUnits) && parsedUnits > 0 ? parsedUnits : 1;
  const accentColor = isUrgent ? "#E11D48" : "#2563EB";
  const badgeBackground = isUrgent ? "#FFF1F2" : "#EFF6FF";

  const content = (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
      className="overflow-hidden rounded-[18px] bg-white"
    >
      <View className="flex-row">
        <View style={{ width: 4, backgroundColor: accentColor }} />

        <View className="min-h-[104px] flex-1 flex-row items-center px-[10px] py-[12px]">
          {/* Avatar and blood group */}
          <View className="relative mr-[12px]">
            <View className="h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-[15px] bg-[#F1F4FF]">
              <Avatar name={avatarName || patientName} photoUrl={avatarUrl} size={58} />
            </View>
            <View
              className="absolute -bottom-[7px] -right-[6px] min-h-[28px] min-w-[28px] items-center justify-center rounded-full border-[2px] border-white bg-[#D90429] px-[3px]"
            >
              <Text className="text-[9px] font-extrabold text-white">{bloodType}</Text>
            </View>
          </View>

          {/* Main details */}
          <View className="min-w-0 flex-1 justify-center pr-[3px]">
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-[14px] font-extrabold leading-[19px] text-[#111827]"
            >
              {patientName}
            </Text>

            <View className="mt-[7px] flex-row items-center">
              <Ionicons name="location" size={13} color="#E11D48" />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="ml-[5px] flex-1 text-[11px] font-medium text-[#64748B]"
              >
                {location}
              </Text>
            </View>

            <View className="mt-[7px] flex-row items-center">
              <Ionicons name="time-outline" size={13} color="#94A3B8" />
              <Text
                numberOfLines={1}
                className="ml-[5px] flex-1 text-[9px] font-semibold uppercase tracking-[0.2px] text-[#94A3B8]"
              >
                {timeAgo}
              </Text>
            </View>
          </View>

          {/* Units, urgency and call */}
          <View className="ml-[5px] w-[65px] items-center justify-center">
            <Text numberOfLines={1} className="text-[10px] font-extrabold text-[#1E293B]">
              {unitCount} {unitCount === 1 ? "Unit" : "Units"}
            </Text>

            <View
              className="mt-[7px] h-[25px] w-[65px] flex-row items-center justify-center rounded-full"
              style={{ backgroundColor: badgeBackground }}
            >
              <Ionicons name="water" size={11} color={accentColor} />
              <Text className="ml-[3px] text-[9px] font-bold" style={{ color: accentColor }}>
                {isUrgent ? "Urgent" : "Normal"}
              </Text>
            </View>

            {showCallButton && (
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Call request contact"
                onPress={(event) => {
                  event.stopPropagation();
                  onCallPress?.();
                }}
                className="mt-[7px] h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FFF1F2]"
              >
                <Ionicons name="call" size={15} color="#E11D48" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (bare) return content;

  return (
    <View
      className="mb-[12px] overflow-hidden rounded-[18px] border border-[#E8EDF3] bg-white"
      style={{
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 7,
        elevation: 2,
      }}
    >
      {content}
    </View>
  );
};

export default BloodRequestCard;

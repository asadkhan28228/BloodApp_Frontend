import React from "react";
import { Image, Text, View } from "react-native";

// ======================================================
// PROFESSIONAL AVATAR
//
// Shows the user's real photo if they've uploaded one.
// Otherwise shows clean initials on a solid color circle
// (like Gmail / Slack / LinkedIn) instead of a random
// cartoon face — looks trustworthy for a medical app.
//
// Legacy accounts that still have an old dicebear.com
// cartoon URL saved as their avatarUrl are automatically
// treated as "no photo" and fall back to initials too, so
// no data migration is needed.
// ======================================================

interface AvatarProps {
  name?: string;
  photoUrl?: string;
  size?: number;
  shape?: "circle" | "rounded";
}

const AVATAR_COLORS = [
  { bg: "#FEE2E2", text: "#DC2626" }, // red
  { bg: "#FFEDD5", text: "#C2410C" }, // orange
  { bg: "#FEF9C3", text: "#A16207" }, // amber
  { bg: "#DCFCE7", text: "#15803D" }, // green
  { bg: "#DBEAFE", text: "#1D4ED8" }, // blue
  { bg: "#E0E7FF", text: "#4338CA" }, // indigo
  { bg: "#F3E8FF", text: "#7E22CE" }, // purple
  { bg: "#FCE7F3", text: "#BE185D" }, // pink
];

const isRealPhoto = (url?: string) => {
  if (!url || !url.trim()) return false;

  // Old accounts may still have a generated cartoon avatar
  // saved from before — treat that as "no real photo".
  if (url.includes("dicebear.com")) return false;

  return true;
};

const getInitials = (name?: string) => {
  if (!name || !name.trim()) return "?";

  // Strip anything that isn't a letter/number/space so stray
  // punctuation (e.g. "Emergency (Blast)") never leaks into the
  // initials shown on the avatar.
  const cleaned = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();

  if (!cleaned) return "?";

  const parts = cleaned.split(/\s+/).filter(Boolean);

  const first = parts[0]?.[0] || "";
  const last =
    parts.length > 1
      ? parts[parts.length - 1]?.[0]
      : "";

  return (first + last).toUpperCase();
};

const getColorForName = (name?: string) => {
  const str = name && name.trim() ? name.trim() : "?";

  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index =
    Math.abs(hash) % AVATAR_COLORS.length;

  return AVATAR_COLORS[index];
};

const Avatar: React.FC<AvatarProps> = ({
  name,
  photoUrl,
  size = 56,
  shape = "rounded",
}) => {
  const borderRadius =
    shape === "circle"
      ? size / 2
      : Math.round(size * 0.28);

  if (isRealPhoto(photoUrl)) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{
          width: size,
          height: size,
          borderRadius,
        }}
        resizeMode="cover"
      />
    );
  }

  const colors = getColorForName(name);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: Math.round(size * 0.36),
          fontWeight: "800",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
};

export default Avatar;
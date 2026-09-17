import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

const FindDonorLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
};

export default FindDonorLayout;

const styles = StyleSheet.create({});

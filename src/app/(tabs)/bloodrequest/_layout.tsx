import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

const BloodRequestLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
};

export default BloodRequestLayout;

const styles = StyleSheet.create({});

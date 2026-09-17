import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

const ProfileLayout = () => {
  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        headerTitleStyle: { fontWeight: "900" },
        headerBackTitle: "Back",
        headerTintColor: "white",
        headerStyle: {
          backgroundColor: "red",
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="aboutapp" options={{ title: "About App" }} />
      <Stack.Screen
        name="privacypolicy"
        options={{ title: "Privacy Policy" }}
      />
    </Stack>
  );
};

export default ProfileLayout;

const styles = StyleSheet.create({});

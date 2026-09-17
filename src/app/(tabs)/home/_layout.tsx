import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

const HomeLayout = () => {
  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        headerBackTitle: "Back",
        headerTintColor: "white",
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: "red",
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Screen
        name="notification"
        options={{
          headerShown: true,
          title: "Notifications",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      <Stack.Screen
        name="requests"
        options={{
          headerShown: true,
          title: "Blood Requests",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      <Stack.Screen
        name="emergency"
        options={{
          headerShown: true,
          title: "Emergency",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
    </Stack>
  );
};

export default HomeLayout;

const styles = StyleSheet.create({});

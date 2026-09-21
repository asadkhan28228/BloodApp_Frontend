import { Stack } from "expo-router";
import React from "react";

const AdminLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {/* MAIN ADMIN DASHBOARD */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      {/* ADMIN PROFILE */}
      <Stack.Screen
        name="profile/index"
        options={{
          headerShown: false,
        }}
      />

      {/* INVENTORY ROLE REDIRECT */}
      <Stack.Screen
        name="inventory/index"
        options={{
          headerShown: false,
        }}
      />

      {/* MAIN ADMIN - BLOOD BANK LIST */}
      <Stack.Screen
        name="inventory/bloodbanks"
        options={{
          headerShown: false,
        }}
      />

      {/* BLOOD BANK ADMIN - MANAGEMENT */}
      <Stack.Screen
        name="inventory/management"
        options={{
          headerShown: false,
        }}
      />

      {/* BLOOD REQUESTS */}
      <Stack.Screen
        name="requests/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default AdminLayout;
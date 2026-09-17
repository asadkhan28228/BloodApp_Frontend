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
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="inventory/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default AdminLayout;
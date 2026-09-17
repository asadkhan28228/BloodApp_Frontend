// import { Ionicons } from "@expo/vector-icons";
// import { Tabs, useSegments } from "expo-router";
// import React from "react";

// const Tabslayout = () => {
//   const segments = useSegments();

//   const hideTabBar =
//     (segments as string[]).includes("notification") ||
//     (segments as string[]).includes("requests") ||
//     (segments as string[]).includes("donors") ||
//     (segments as string[]).includes("aboutapp") ||
//     (segments as string[]).includes("privacypolicy") ||
//     (segments as string[]).includes("emergency");

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: "#DC2626",
//         tabBarInactiveTintColor: "#9CA3AF",
//         tabBarShowLabel: true,
//         tabBarHideOnKeyboard: true,
//         tabBarStyle: {
//           display: hideTabBar ? "none" : "flex",
//           position: "absolute",
//           left: 16,
//           right: 16,
//           bottom: 12,
//           height: 76,
//           borderTopWidth: 0,
//           borderRadius: 22,
//           backgroundColor: "#FFFFFF",
//           borderColor: "#F3F4F6",
//           shadowColor: "#000000",
//           shadowOffset: { width: 0, height: 6 },
//           shadowOpacity: 0.08,
//           shadowRadius: 12,
//           elevation: 8,
//           paddingBottom: 8,
//           paddingTop: 8,
//         },
//         tabBarItemStyle: {
//           borderRadius: 16,
//           justifyContent: "center",
//           alignItems: "center",
//         },
//         tabBarLabelStyle: {
//           fontSize: 11,
//           fontWeight: "600",
//           marginTop: 2,
//         },
//       }}
//     >
//       {/* Home */}
//       <Tabs.Screen
//         name="home"
//         options={{
//           title: "Home",
//           tabBarIcon: ({ focused, color, size }) => (
//             <Ionicons
//               name={focused ? "home" : "home-outline"}
//               size={size}
//               color={color}
//             />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="finddonor"
//         options={{
//           title: "Find Donors",
//           tabBarIcon: ({ focused, color, size }) => (
//             <Ionicons
//               name={focused ? "search" : "search-outline"}
//               size={size + 2}
//               color={color}
//             />
//           ),
//         }}
//       />

//       {/* Blood Requests */}
//       <Tabs.Screen
//         name="bloodrequest"
//         options={{
//           title: "Requests",
//           tabBarIcon: ({ focused, color, size }) => (
//             <Ionicons
//               name={focused ? "water" : "water-outline"}
//               size={size + 2}
//               color={color}
//             />
//           ),
//         }}
//       />

//       {/* Profile */}
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: "Profile",
//           tabBarIcon: ({ focused, color, size }) => (
//             <Ionicons
//               name={focused ? "person" : "person-outline"}
//               size={size}
//               color={color}
//             />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// };

// export default Tabslayout;
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useSegments } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const getTabIcon = (
  routeName: string,
  focused: boolean,
  color: string,
  size: number
) => {
  switch (routeName) {
    case "home":
      return (
        <Ionicons
          name={focused ? "home" : "home-outline"}
          size={size}
          color={color}
        />
      );
    case "finddonor":
      return (
        <Ionicons
          name={focused ? "search" : "search-outline"}
          size={size + 2}
          color={color}
        />
      );
    case "bloodrequest":
      return (
        <Ionicons
          name={focused ? "water" : "water-outline"}
          size={size + 2}
          color={color}
        />
      );
    case "profile":
      return (
        <Ionicons
          name={focused ? "person" : "person-outline"}
          size={size}
          color={color}
        />
      );
    default:
      return null;
  }
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarWrap}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <View style={[styles.iconWrap, isFocused && styles.activeIconWrap]}>
              {getTabIcon(
                route.name,
                isFocused,
                isFocused ? "#DC2626" : "#9CA3AF",
                22
              )}
            </View>
            <Text style={[styles.label, isFocused && styles.activeLabel]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const Tabslayout = () => {
  const segments = useSegments();

  const hideTabBar =
    (segments as string[]).includes("notification") ||
    (segments as string[]).includes("requests") ||
    (segments as string[]).includes("donors") ||
    (segments as string[]).includes("aboutapp") ||
    (segments as string[]).includes("privacypolicy") ||
    (segments as string[]).includes("emergency");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) =>
        hideTabBar ? null : <CustomTabBar {...props} />
      }
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="finddonor" options={{ title: "Find Donors" }} />
      <Tabs.Screen name="bloodrequest" options={{ title: "Requests" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabBarWrap: {
    position: "absolute",
    left: 1,
    right: 1,
    bottom: 2,
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  iconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  activeIconWrap: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  activeLabel: {
    color: "#DC2626",
  },
});

export default Tabslayout;
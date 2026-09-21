import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { Stack, useRouter, useSegments } from "expo-router";
import {
  onAuthStateChanged,
  signOut,
} from "@/src/lib/backendCompat";
import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  View,
} from "react-native";
import "../../global.css";

import { auth, db } from "../config/backendConfig";
import {
  isAdminRole,
  useUserStore,
} from "../store/userStore";

import * as Notifications from "expo-notifications";
import {
  registerForPushNotificationsAsync,
} from "../utils/pushNotifications";

import { apiRequest } from "../lib/api";

// ======================================================
// NOTIFICATION CONFIGURATION
// ======================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const BACKEND_SESSION_TIMEOUT_MS = 5000;

// ======================================================
// ROOT LAYOUT
// ======================================================

const Rootlayout = () => {
  const [initializing, setInitializing] =
    useState(true);

  const [noInternet, setNoInternet] =
    useState(false);

  const {
    user,
    fetchUser,
    clearUser,
  } = useUserStore();

  const router = useRouter();

  const segments = useSegments();

  const initDone = useRef(false);

  const [
    isNavigationReady,
    setIsNavigationReady,
  ] = useState(false);

  // ======================================================
  // PHASE 1
  // NETWORK CHECK + BACKEND SESSIONENTICATION
  // ======================================================

  useEffect(() => {
    let timeoutId: ReturnType<
      typeof setTimeout
    >;

    let unsubscribeAuth:
      | (() => void)
      | null = null;

    const finishInit = () => {
      if (initDone.current) return;

      initDone.current = true;

      setInitializing(false);
    };

    const bootstrap = async () => {
      try {
        // ------------------------------------------
        // 1. CHECK INTERNET
        // ------------------------------------------

        const networkState =
          await Network.getNetworkStateAsync();

        const connected =
          networkState.isConnected &&
          networkState.isInternetReachable;

        if (!connected) {
          setNoInternet(true);

          finishInit();

          return;
        }

        // ------------------------------------------
        // 2. BACKEND SESSION TIMEOUT
        // ------------------------------------------

        timeoutId = setTimeout(() => {
          console.warn(
            "backend session timed out — no internet or slow network"
          );

          clearUser();

          setNoInternet(true);

          finishInit();
        }, BACKEND_SESSION_TIMEOUT_MS);

        // ------------------------------------------
        // 3. BACKEND SESSION LISTENER
        // ------------------------------------------

        unsubscribeAuth =
          onAuthStateChanged(
            auth,
            async (sessionUser) => {
              clearTimeout(timeoutId);

              if (sessionUser) {
                /*
                  Authentication backend se ho rahi hai.

                  User profile / role / isActive
                  .NET backend se fetchUser() ke through
                  load hoga.
                */

                await fetchUser(
                  sessionUser.uid
                );
              } else {
                clearUser();
              }

              finishInit();
            }
          );
      } catch (error) {
        console.error(
          "Bootstrap error:",
          error
        );

        clearUser();

        finishInit();
      }
    };

    bootstrap();

    return () => {
      clearTimeout(timeoutId);

      unsubscribeAuth?.();
    };
  }, []);

  // ======================================================
  // PHASE 2
  // ROLE BASED ROUTING
  // ======================================================

  useEffect(() => {
    if (initializing) return;

    // ------------------------------------------
    // CURRENT ROUTE CHECK
    // ------------------------------------------

    const currentSegment =
      segments[0] as string | undefined;

    const inAuthGroup =
      currentSegment === "(auth)";

    const inTabsGroup =
      currentSegment === "(tabs)";

    const inAdminGroup =
      currentSegment === "admin";

    const isDonorRoute =
      currentSegment === "donor";

    const onNoInternetScreen =
      currentSegment === "noInternet";

    const handleRouting = async () => {
      try {
        // ------------------------------------------
        // CHECK INTERNET
        // ------------------------------------------

        const networkState =
          await Network.getNetworkStateAsync();

        const connected =
          networkState.isConnected &&
          networkState.isInternetReachable;

        // ==========================================
        // NO INTERNET
        // ==========================================

        if (!connected) {
          setNoInternet(true);

          if (!onNoInternetScreen) {
            router.replace(
              "/noInternet"
            );
          }

          return;
        }

        // ==========================================
        // INTERNET RESTORED
        // ==========================================

        if (
          connected &&
          (
            onNoInternetScreen ||
            noInternet
          )
        ) {
          setNoInternet(false);

          if (user) {
            // --------------------------------------
            // DISABLED NORMAL USER
            // --------------------------------------

            if (
              user.isActive === false &&
              !isAdminRole(user.role)
            ) {
              Alert.alert(
                "Account Disabled",
                "Your account has been disabled by the administrator."
              );

              clearUser();

              await signOut(auth);

              router.replace(
                "/(auth)" as any
              );

              return;
            }

            // --------------------------------------
            // ADMIN
            // --------------------------------------

            if (isAdminRole(user.role)) {
              router.replace(
                user.role ===
                  "bloodBankAdmin"
                  ? ("/admin/inventory" as any)
                  : ("/admin" as any)
              );
            }

            // --------------------------------------
            // NORMAL USER
            // --------------------------------------

            else {
              router.replace(
                "/(tabs)/home"
              );
            }
          } else {
            router.replace(
              "/(auth)/welcome"
            );
          }

          return;
        }

        // ------------------------------------------
        // WELCOME STATUS
        // ------------------------------------------

        const hasSeenWelcome =
          await AsyncStorage.getItem(
            "hasSeenWelcome"
          );

        // ==========================================
        // USER LOGGED IN
        // ==========================================

        if (user) {
          // ========================================
          // DISABLED USER CHECK
          // ========================================

          if (
            user.isActive === false &&
            !isAdminRole(user.role)
          ) {
            Alert.alert(
              "Account Disabled",
              "Your account has been disabled by the administrator."
            );

            clearUser();

            await signOut(auth);

            router.replace(
              "/(auth)" as any
            );

            return;
          }

          // ----------------------------------------
          // ADMIN USER
          // ----------------------------------------

          if (isAdminRole(user.role)) {
            /*
              Admin ko normal user tabs,
              donor screen ya auth screens
              access nahi karne dena.
            */

            const adminSection =
              segments[1] as
                | string
                | undefined;

            const isBloodBankAdmin =
              user.role === "bloodBankAdmin";

            // Blood Bank Admin ke allowed admin sections.
            const bloodBankAdminAllowedSections = [
              "inventory",
              "profile",
              "requests",
            ];

            // Admin group se bahar ho to default admin
            // dashboard par redirect karein.
            if (!inAdminGroup) {
              router.replace(
                isBloodBankAdmin
                  ? ("/admin/inventory" as any)
                  : ("/admin" as any)
              );

              return;
            }

            // Blood Bank Admin ko sirf Inventory,
            // Profile aur Requests sections allow hain.
            if (
              isBloodBankAdmin &&
              !bloodBankAdminAllowedSections.includes(
                adminSection ?? ""
              )
            ) {
              router.replace(
                "/admin/inventory" as any
              );

              return;
            }

            return;
          }

          // ----------------------------------------
          // NORMAL USER
          // ----------------------------------------

          /*
            Agar normal user ne
            /admin route access karne ki
            koshish ki to home par bhej do.
          */

          if (inAdminGroup) {
            router.replace(
              "/(tabs)/home"
            );

            return;
          }

          /*
            Existing application behavior:
            tabs aur donor routes allowed hain.
          */

          if (
            !inTabsGroup &&
            !isDonorRoute
          ) {
            router.replace(
              "/(tabs)/home"
            );
          }
        }

        // ==========================================
        // USER NOT LOGGED IN
        // ==========================================

        else {
          if (
            hasSeenWelcome === "true"
          ) {
            /*
              User welcome screen already
              dekh chuka hai, isliye login.
            */

            if (
              !inAuthGroup ||
              segments[1] ===
                "welcome"
            ) {
              router.replace(
                "/(auth)"
              );
            }
          } else {

            if (
              segments[1] !==
              "welcome"
            ) {
              router.replace(
                "/(auth)/welcome"
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "Error in handleRouting:",
          error
        );
      }
    };

    handleRouting();

    setIsNavigationReady(true);
  }, [
    user,
    initializing,
    segments,
    noInternet,
  ]);

  // ======================================================
  // PHASE 3
  // PUSH NOTIFICATION SETUP
  // ======================================================

  useEffect(() => {
    const setupNotifications =
      async () => {
        try {
          console.log(
            "Starting push notification setup..."
          );

          // ------------------------------------------
          // GET EXPO PUSH TOKEN
          // ------------------------------------------

          const token =
            await registerForPushNotificationsAsync();

          console.log(
            "Push token received:",
            token
          );

          // ------------------------------------------
          // SAVE TOKEN IN .NET BACKEND
          // JWT identifies the logged-in user; Firebase/auth.currentUser is not used.
          // ------------------------------------------

          if (token) {
            await apiRequest(
              "/api/user/push-token",
              {
                method: "PUT",
                body: JSON.stringify(
                  token
                ),
              }
            );

            console.log(
              "Push token registered successfully with .NET backend."
            );
          } else {
            console.warn(
              "Push token was not registered because no Expo push token was available."
            );
          }
        } catch (error) {
          console.error(
            "Failed to setup push notifications / register token:",
            error
          );
        }
      };

    /*
      Sirf active normal users ke liye
      push token register hoga.

      Admin ke liye current behavior
      same rakha gaya hai.
    */

    if (
      user &&
      !isAdminRole(user.role) &&
      user.isActive !== false
    ) {
      setupNotifications();
    }

    // ==================================================
    // NOTIFICATION CLICK
    // ==================================================

    const responseSubscription =
      Notifications
        .addNotificationResponseReceivedListener(
          (response) => {
            const data =
              response
                .notification
                .request
                .content
                .data;

            if (data) {
              /*
                Normal user ko notification page
                par bhejo.

                Admin ko normal tabs mein
                nahi bhejna.
              */

              if (
                isAdminRole(
                  user?.role
                )
              ) {
                router.push(
                  user?.role ===
                    "bloodBankAdmin"
                    ? ("/admin/inventory" as any)
                    : ("/admin" as any)
                );
              } else {
                router.push(
                  "/(tabs)/home/notification"
                );
              }
            }
          }
        );

    return () => {
      responseSubscription.remove();
    };
  }, [user]);
  

  // ======================================================
  // LOADING SCREEN
  // ======================================================

  if (
    initializing ||
    !isNavigationReady
  ) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />
      </View>
    );
  }

  // ======================================================
  // APPLICATION ROUTES
  // ======================================================

  return (
    <Stack
      screenOptions={{
        animation:
          "slide_from_right",

        headerBackTitle:
          "Back",

        headerTintColor:
          "white",

        headerTitleAlign:
          "center",

        headerStyle: {
          backgroundColor:
            "red",
        },
      }}
    >
      {/* ==========================================
          AUTHENTICATION
      ========================================== */}

      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
        }}
      />

      {/* ==========================================
          NORMAL USER APPLICATION
      ========================================== */}

      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />

      {/* ==========================================
          ADMIN APPLICATION
      ========================================== */}

      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
        }}
      />

      {/* ==========================================
          NO INTERNET
      ========================================== */}

      <Stack.Screen
        name="noInternet"
        options={{
          headerShown: false,
        }}
      />


      {/* ==========================================
          DONOR DETAILS
      ========================================== */}

      <Stack.Screen
        name="donor/[id]"
        options={{ 
        headerShown: true, 
        }}
      />
    </Stack>
    
  );
};

export default Rootlayout;
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
              user.role ===
              "bloodBankAdmin";

            if (
              !inAdminGroup ||
              (
                isBloodBankAdmin &&
                adminSection !==
                  "inventory"
              )
            ) {
              router.replace(
                isBloodBankAdmin
                  ? ("/admin/inventory" as any)
                  : ("/admin" as any)
              );
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
            /*
              First time app user.
              Welcome screen show hogi.
            */

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
  // PHASE 4
  // FIRESTORE NOTIFICATION LISTENERS REMOVED
  // ======================================================

  /*
    IMPORTANT:

    Yahan pehle backend database ke:

      collection(db, "notifications")
      collection(db, "community_notifications")
      onSnapshot(...)
      query(...)
      where(...)

    listeners lage hue thay.

    Ab ye remove kar diye gaye hain.

    Notification data .NET backend se aayega.

    PRIVATE NOTIFICATIONS:

      GET /api/notifications

    UNREAD COUNT:

      GET /api/notifications/unread-count

    COMMUNITY NOTIFICATIONS:

      GET /api/notifications/community

    MARK AS READ:

      PATCH /api/notifications/{id}/read

    MARK ALL AS READ:

      PATCH /api/notifications/read-all

    DELETE:

      DELETE /api/notifications/{id}

    PUSH TOKEN:

      PUT /api/user/push-token

    Isliye backend database ab notification database
    ke taur par use nahi ho raha.
  */

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


// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as Network from "expo-network";
// import { Stack, useRouter, useSegments } from "expo-router";
// import {onAuthStateChanged,signOut,} from "@/src/lib/backendCompat";
// import React, {useEffect,useRef,useState,} from "react";
// import {ActivityIndicator,Alert,View,} from "react-native";
// import "../../global.css";

// import { auth, db } from "../config/backendConfig";
// import { isAdminRole, useUserStore } from "../store/userStore";

// import {collection,query,where,onSnapshot,doc,setDoc,} from "@/src/lib/backendCompat";
// import * as Notifications from "expo-notifications";
// import { registerForPushNotificationsAsync } from "../utils/pushNotifications";

// // ======================================================
// // Notification Configuration
// // ======================================================

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

// const BACKEND_SESSION_TIMEOUT_MS = 5000;

// const Rootlayout = () => {
//   const [initializing, setInitializing] =
//     useState(true);

//   const [noInternet, setNoInternet] =
//     useState(false);

//   const {
//     user,
//     fetchUser,
//     clearUser,
//   } = useUserStore();

//   const router = useRouter();

//   const segments = useSegments();

//   const initDone = useRef(false);

//   const [
//     isNavigationReady,
//     setIsNavigationReady,
//   ] = useState(false);

//   // ======================================================
//   // PHASE 1
//   // Network Check + Backend Authentication
//   // ======================================================

//   useEffect(() => {
//     let timeoutId: ReturnType<
//       typeof setTimeout
//     >;

//     let unsubscribeAuth:
//       | (() => void)
//       | null = null;

//     const finishInit = () => {
//       if (initDone.current) return;

//       initDone.current = true;

//       setInitializing(false);
//     };

//     const bootstrap = async () => {
//       try {
//         // ------------------------------------------
//         // 1. Check Internet
//         // ------------------------------------------

//         const networkState =
//           await Network.getNetworkStateAsync();

//         const connected =
//           networkState.isConnected &&
//           networkState.isInternetReachable;

//         if (!connected) {
//           setNoInternet(true);

//           finishInit();

//           return;
//         }

//         // ------------------------------------------
//         // 2. Backend Timeout
//         // ------------------------------------------

//         timeoutId = setTimeout(() => {
//           console.warn(
//             "backend session timed out — no internet or slow network"
//           );

//           clearUser();

//           setNoInternet(true);

//           finishInit();
//         }, BACKEND_SESSION_TIMEOUT_MS);

//         // ------------------------------------------
//         // 3. Backend Auth Listener
//         // ------------------------------------------

//         unsubscribeAuth =
//           onAuthStateChanged(
//             auth,
//             async (sessionUser) => {
//               clearTimeout(timeoutId);

//               if (sessionUser) {
//                 // backend database se complete profile load hoga
//                 // including role and isActive

//                 await fetchUser(
//                   sessionUser.uid
//                 );
//               } else {
//                 clearUser();
//               }

//               finishInit();
//             }
//           );
//       } catch (error) {
//         console.error(
//           "Bootstrap error:",
//           error
//         );

//         clearUser();

//         finishInit();
//       }
//     };

//     bootstrap();

//     return () => {
//       clearTimeout(timeoutId);

//       unsubscribeAuth?.();
//     };
//   }, []);

//   // ======================================================
//   // PHASE 2
//   // ROLE BASED ROUTING
//   // ======================================================

//   useEffect(() => {
//     if (initializing) return;

//     // ------------------------------------------
//     // Current Route Check
//     // ------------------------------------------

//     const currentSegment =
//       segments[0] as string | undefined;

//     const inAuthGroup =
//       currentSegment === "(auth)";

//     const inTabsGroup =
//       currentSegment === "(tabs)";

//     const inAdminGroup =
//       currentSegment === "admin";

//     const isDonorRoute =
//       currentSegment === "donor";

//     const onNoInternetScreen =
//       currentSegment === "noInternet";

//     const handleRouting = async () => {
//       try {
//         // ------------------------------------------
//         // Check Internet
//         // ------------------------------------------

//         const networkState =
//           await Network.getNetworkStateAsync();

//         const connected =
//           networkState.isConnected &&
//           networkState.isInternetReachable;

//         // ==========================================
//         // NO INTERNET
//         // ==========================================

//         if (!connected) {
//           setNoInternet(true);

//           if (!onNoInternetScreen) {
//             router.replace(
//               "/noInternet"
//             );
//           }

//           return;
//         }

//         // ==========================================
//         // INTERNET RESTORED
//         // ==========================================

//         if (
//           connected &&
//           (onNoInternetScreen ||
//             noInternet)
//         ) {
//           setNoInternet(false);

//           if (user) {
//             // Disabled normal user
//             if (
//               user.isActive === false &&
//               !isAdminRole(user.role)
//             ) {
//               Alert.alert(
//                 "Account Disabled",
//                 "Your account has been disabled by the administrator."
//               );

//               clearUser();

//               await signOut(auth);

//               router.replace(
//                 "/(auth)" as any
//               );

//               return;
//             }

//             // ADMIN
//             if (isAdminRole(user.role)) {
//               router.replace(
//                 user.role === "bloodBankAdmin"
//                   ? ("/admin/inventory" as any)
//                   : ("/admin" as any)
//               );
//             }

//             // NORMAL USER
//             else {
//               router.replace(
//                 "/(tabs)/home"
//               );
//             }
//           } else {
//             router.replace(
//               "/(auth)/welcome"
//             );
//           }

//           return;
//         }

//         const hasSeenWelcome =
//           await AsyncStorage.getItem(
//             "hasSeenWelcome"
//           );

//         // ==========================================
//         // USER LOGGED IN
//         // ==========================================

//         if (user) {
//           // ========================================
//           // DISABLED USER CHECK
//           // ========================================

//           if (
//             user.isActive === false &&
//             !isAdminRole(user.role)
//           ) {
//             Alert.alert(
//               "Account Disabled",
//               "Your account has been disabled by the administrator."
//             );

//             clearUser();

//             await signOut(auth);

//             router.replace(
//               "/(auth)" as any
//             );

//             return;
//           }

//           // ----------------------------------------
//           // ADMIN USER
//           // ----------------------------------------

//           if (isAdminRole(user.role)) {
//             /*
//               Admin ko normal user tabs,
//               donor screen ya auth screens
//               access nahi karne dena.
//             */

//             const adminSection = segments[1] as string | undefined;
//             const isBloodBankAdmin =
//               user.role === "bloodBankAdmin";

//             if (
//               !inAdminGroup ||
//               (isBloodBankAdmin &&
//                 adminSection !== "inventory")
//             ) {
//               router.replace(
//                 isBloodBankAdmin
//                   ? ("/admin/inventory" as any)
//                   : ("/admin" as any)
//               );
//             }

//             return;
//           }

//           // ----------------------------------------
//           // NORMAL USER
//           // ----------------------------------------

//           /*
//             Agar kisi normal user ne
//             /admin route access karne ki
//             koshish ki to home par bhej do.
//           */

//           if (inAdminGroup) {
//             router.replace(
//               "/(tabs)/home"
//             );

//             return;
//           }

//           /*
//             Existing application behavior:
//             tabs aur donor routes allowed hain.
//           */

//           if (
//             !inTabsGroup &&
//             !isDonorRoute
//           ) {
//             router.replace(
//               "/(tabs)/home"
//             );
//           }
//         }

//         // ==========================================
//         // USER NOT LOGGED IN
//         // ==========================================

//         else {
//           if (
//             hasSeenWelcome === "true"
//           ) {
//             // User welcome screen already dekh chuka hai
//             // isliye Login screen

//             if (
//               !inAuthGroup ||
//               segments[1] ===
//                 "welcome"
//             ) {
//               router.replace(
//                 "/(auth)"
//               );
//             }
//           } else {
//             // First time app user
//             // Welcome screen show hogi

//             if (
//               segments[1] !==
//               "welcome"
//             ) {
//               router.replace(
//                 "/(auth)/welcome"
//               );
//             }
//           }
//         }
//       } catch (error) {
//         console.error(
//           "Error in handleRouting:",
//           error
//         );
//       }
//     };

//     handleRouting();

//     setIsNavigationReady(true);
//   }, [
//     user,
//     initializing,
//     segments,
//     noInternet,
//   ]);

//   // ======================================================
//   // PHASE 3
//   // Push Notification Setup
//   // ======================================================

//   useEffect(() => {
//     const setupNotifications =
//       async () => {
//         try {
//           const token =
//             await registerForPushNotificationsAsync();

//           const currentUid =
//             auth.currentUser?.uid;

//           if (
//             currentUid &&
//             token
//           ) {
//             const userDocRef = doc(
//               db,
//               "users",
//               currentUid
//             );

//             await setDoc(
//               userDocRef,
//               {
//                 pushToken: token,
//               },
//               {
//                 merge: true,
//               }
//             );

//             console.log(
//               "Expo Push Token registered to backend database user profile successfully."
//             );
//           }
//         } catch (error) {
//           console.error(
//             "Failed to setup push notifications / register token:",
//             error
//           );
//         }
//       };

//     /*
//       Push notification normal users
//       ke liye run hongi.

//       Admin notifications admin module
//       mein separately handle hongi.
//     */

//     if (
//       user &&
//       !isAdminRole(user.role) &&
//       user.isActive !== false
//     ) {
//       setupNotifications();
//     }

//     // ------------------------------------------
//     // Notification Click
//     // ------------------------------------------

//     const responseSubscription =
//       Notifications
//         .addNotificationResponseReceivedListener(
//           (response) => {
//             const data =
//               response.notification
//                 .request.content.data;

//             if (data) {
//               /*
//                 Normal user ko existing
//                 notification page par bhejo.

//                 Admin ko normal tabs mein
//                 nahi bhejna.
//               */

//               if (isAdminRole(user?.role)) {
//                 router.push(
//                   user?.role === "bloodBankAdmin"
//                     ? ("/admin/inventory" as any)
//                     : ("/admin" as any)
//                 );
//               } else {
//                 router.push(
//                   "/(tabs)/home/notification"
//                 );
//               }
//             }
//           }
//         );

//     return () => {
//       responseSubscription.remove();
//     };
//   }, [user]);

//   // ======================================================
//   // PHASE 4
//   // backend database Notification Listeners
//   // ======================================================

//   useEffect(() => {
//     /*
//       Admin ke liye normal user
//       notification listeners run nahi karenge.

//       Disabled user ke liye bhi
//       notifications run nahi karenge.
//     */

//     if (
//       !user ||
//       isAdminRole(user.role) ||
//       user.isActive === false
//     ) {
//       return;
//     }

//     const userId =
//       auth.currentUser?.uid;

//     if (!userId) return;

//     const notifiedIds =
//       new Set<string>();

//     // ------------------------------------------
//     // Private Notifications
//     // ------------------------------------------

//     const privateQuery = query(
//       collection(
//         db,
//         "notifications"
//       ),
//       where(
//         "userId",
//         "==",
//         userId
//       )
//     );

//     // ------------------------------------------
//     // Community Notifications
//     // ------------------------------------------

//     const communityQuery = query(
//       collection(
//         db,
//         "community_notifications"
//       )
//     );

//     // ==========================================
//     // PRIVATE NOTIFICATION LISTENER
//     // ==========================================

//     let initialPrivate = true;

//     const unsubscribePrivate =
//       onSnapshot(
//         privateQuery,
//         (snapshot) => {
//           // Existing notifications skip

//           if (initialPrivate) {
//             snapshot.docs.forEach(
//               (document) =>
//                 notifiedIds.add(
//                   document.id
//                 )
//             );

//             initialPrivate = false;

//             return;
//           }

//           snapshot
//             .docChanges()
//             .forEach(
//               async (change) => {
//                 if (
//                   change.type ===
//                   "added"
//                 ) {
//                   const id =
//                     change.doc.id;

//                   const data =
//                     change.doc.data();

//                   if (
//                     !notifiedIds.has(
//                       id
//                     )
//                   ) {
//                     notifiedIds.add(
//                       id
//                     );

//                     await Notifications
//                       .scheduleNotificationAsync(
//                         {
//                           content: {
//                             title:
//                               data.title ||
//                               "New Notification",

//                             body:
//                               data.message ||
//                               "",

//                             data: {
//                               ...data,
//                               id,
//                             },
//                           },

//                           trigger: null,
//                         }
//                       );
//                   }
//                 }
//               }
//             );
//         }
//       );

//     // ==========================================
//     // COMMUNITY NOTIFICATION LISTENER
//     // ==========================================

//     let initialCommunity = true;

//     const unsubscribeCommunity =
//       onSnapshot(
//         communityQuery,
//         (snapshot) => {
//           // Existing notifications skip

//           if (initialCommunity) {
//             snapshot.docs.forEach(
//               (document) =>
//                 notifiedIds.add(
//                   document.id
//                 )
//             );

//             initialCommunity = false;

//             return;
//           }

//           snapshot
//             .docChanges()
//             .forEach(
//               async (change) => {
//                 if (
//                   change.type ===
//                   "added"
//                 ) {
//                   const id =
//                     change.doc.id;

//                   const data =
//                     change.doc.data();

//                   if (
//                     !notifiedIds.has(
//                       id
//                     )
//                   ) {
//                     notifiedIds.add(
//                       id
//                     );

//                     // Reporter ko apna hi emergency alert na mile

//                     if (
//                       data.reporterUid ===
//                       auth.currentUser
//                         ?.uid
//                     ) {
//                       return;
//                     }

//                     await Notifications
//                       .scheduleNotificationAsync(
//                         {
//                           content: {
//                             title:
//                               data.title ||
//                               "Emergency Alert! 🚨",

//                             body:
//                               data.message ||
//                               "",

//                             data: {
//                               ...data,
//                               id,
//                             },
//                           },

//                           trigger: null,
//                         }
//                       );
//                   }
//                 }
//               }
//             );
//         }
//       );

//     return () => {
//       unsubscribePrivate();

//       unsubscribeCommunity();
//     };
//   }, [user]);

//   // ======================================================
//   // LOADING SCREEN
//   // ======================================================

//   if (
//     initializing ||
//     !isNavigationReady
//   ) {
//     return (
//       <View
//         style={{
//           flex: 1,
//           justifyContent:
//             "center",
//           alignItems:
//             "center",
//         }}
//       >
//         <ActivityIndicator
//           size="large"
//           color="#DC2626"
//         />
//       </View>
//     );
//   }

//   // ======================================================
//   // APPLICATION ROUTES
//   // ======================================================

//   return (
//     <Stack
//       screenOptions={{
//         animation:
//           "slide_from_right",

//         headerBackTitle:
//           "Back",

//         headerTintColor:
//           "white",

//         headerTitleAlign:
//           "center",

//         headerStyle: {
//           backgroundColor:
//             "red",
//         },
//       }}
//     >
//       {/* Authentication */}

//       <Stack.Screen
//         name="(auth)"
//         options={{
//           headerShown: false,
//         }}
//       />

//       {/* Normal User Application */}

//       <Stack.Screen
//         name="(tabs)"
//         options={{
//           headerShown: false,
//         }}
//       />

//       {/* ADMIN APPLICATION */}

//       <Stack.Screen
//         name="admin"
//         options={{
//           headerShown: false,
//         }}
//       />

//       {/* No Internet */}

//       <Stack.Screen
//         name="noInternet"
//         options={{
//           headerShown: false,
//         }}
//       />

//       {/* Donor Details */}

//       <Stack.Screen
//         name="donor/[id]"
//         options={{
//           headerShown: true,
//         }}
//       />
//     </Stack>
//   );
// };

// export default Rootlayout;
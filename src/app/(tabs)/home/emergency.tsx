import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import {
  collection,
  getDocs,
  getDoc,
  orderBy,
  query,
  addDoc,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "@/src/lib/backendCompat";

import { auth, db } from "../../../config/backendConfig";

import BloodRequestCard from "@/src/components/bloodRequestCard";

import Donorcard from "@/src/components/donorcard";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useUserStore } from "../../../store/userStore";
import { apiRequest } from "../../../lib/api";



import { calculateDistance } from "../../../utils/distanceUtils";
import {
  saveCurrentLocation,
  getFreshGpsLocation,
} from "../../../utils/locationService";

// ======================================================
// EMERGENCY CATEGORIES
// ======================================================

const EmergencyCategories = [
  { label: "Blast", icon: "flash-outline" },
  { label: "Fire", icon: "flame-outline" },
  { label: "Disaster", icon: "earth-outline" },
  { label: "Mass Accident", icon: "car-outline" },
  { label: "Blood Shortage", icon: "medkit-outline" },
  { label: "Critical Incident", icon: "warning-outline" },
  { label: "Rare Blood", icon: "water-outline" },
];

// ======================================================
// AUTO-EXPIRY HELPER
//
// Every emergency/blood-request gets an "expireAt" field
// set to 2 days from creation. A backend database TTL policy on
// this field then deletes the document automatically if
// nobody resolves it in time.
// ======================================================

const EMERGENCY_TTL_DAYS = 2;

const getExpiryTimestamp = () => {
  const expiryDate = new Date(
    Date.now() +
      EMERGENCY_TTL_DAYS *
        24 *
        60 *
        60 *
        1000
  );

  return Timestamp.fromDate(
    expiryDate
  );
};

const BloodTypes = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
  "ANY",
];

// ======================================================
// EMERGENCY PRIORITY LEVELS
// ======================================================

const PriorityLevels = [
  {
    label: "Critical",
    color: "#DC2626",
    background: "#FEE2E2",
    unitsNeeded: 4,
  },
  {
    label: "High",
    color: "#EA580C",
    background: "#FFEDD5",
    unitsNeeded: 3,
  },
  {
    label: "Medium",
    color: "#CA8A04",
    background: "#FEF9C3",
    unitsNeeded: 2,
  },
] as const;

// Default priority suggested for each emergency category.
// The reporter can still change it before submitting.
const CategoryDefaultPriority: Record<string, string> = {
  Blast: "Critical",
  Fire: "Critical",
  Disaster: "Critical",
  "Mass Accident": "Critical",
  "Blood Shortage": "High",
  "Critical Incident": "Critical",
  "Rare Blood": "High",
};

// ======================================================
// EMERGENCY SCREEN
// ======================================================

const Emergency = () => {
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();

  const screenView =
    view === "requests" || view === "donors"
      ? view
      : "home";

  const {
    user: currentUserData,
    fetchUser,
  } = useUserStore();

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    "requests" | "donors"
  >(screenView === "donors" ? "donors" : "requests");

  // Sub-tab for the "Urgent Donor Requests" screen: toggles between
  // requests reported by the current user ("my") and requests
  // reported by other users ("community"). Only one group's data
  // is shown at a time based on this selection.
  const [
    requestSubView,
    setRequestSubView,
  ] = useState<"my" | "community">("my");

  const [
    requests,
    setRequests,
  ] = useState<any[]>([]);

  const [
    donors,
    setDonors,
  ] = useState<any[]>([]);

  const [
    filteredRequests,
    setFilteredRequests,
  ] = useState<any[]>([]);

  const [
    filteredDonors,
    setFilteredDonors,
  ] = useState<any[]>([]);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  // ======================================================
  // EMERGENCY REPORT MODAL STATES
  // ======================================================

  const [
    reportModalVisible,
    setReportModalVisible,
  ] = useState(false);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<string>("");

  const [
    reportLocation,
    setReportLocation,
  ] = useState("");

  const [
    reportPhone,
    setReportPhone,
  ] = useState("");

  const [
    reportBloodType,
    setReportBloodType,
  ] = useState("ANY");

  const [
    reportPriority,
    setReportPriority,
  ] = useState<string>("Critical");

  const [
    showBloodTypePicker,
    setShowBloodTypePicker,
  ] = useState(false);

  const [
    reportNotes,
    setReportNotes,
  ] = useState("");

  const [
    submitLoading,
    setSubmitLoading,
  ] = useState(false);

  const [
    reservedDialog,
    setReservedDialog,
  ] = useState<{
    emergencyId: string;
    unitsNeeded: number;
    bloodType: string;
    onDone: () => void;
  } | null>(null);

  // Responding Donors Modal
  const [
    respondersModalVisible,
    setRespondersModalVisible,
  ] = useState(false);

  const [
    selectedResponders,
    setSelectedResponders,
  ] = useState<any[]>([]);

  const [
    selectedEmergencyId,
    setSelectedEmergencyId,
  ] = useState("");

  // Current logged-in donor's emergency responses from ASP.NET API.
  // This drives the step-by-step Accepted -> On The Way -> Arrived -> Completed UI.
  const [
    myEmergencyResponses,
    setMyEmergencyResponses,
  ] = useState<any[]>([]);

  // Nearby Donors Modal
  const [
    nearbyDonorsModalVisible,
    setNearbyDonorsModalVisible,
  ] = useState(false);

  const [
    nearbyDonors,
    setNearbyDonors,
  ] = useState<any[]>([]);

  const [
    selectedNearbyEmergencyId,
    setSelectedNearbyEmergencyId,
  ] = useState("");

  const [
    selectedNearbyBloodType,
    setSelectedNearbyBloodType,
  ] = useState("");

  // Blood bank contact info (settings/bloodBank), shown ONLY to the
  // reporter of a request that was fulfilled from the reserve — so
  // they know exactly who to contact to collect the reserved blood.
  const [
    bloodBankContact,
    setBloodBankContact,
  ] = useState<{
    name: string;
    phoneNumber: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  } | null>(null);

  // Keep the selected interface in sync with the navigation query.
  useEffect(() => {
    if (screenView === "requests") {
      setActiveTab("requests");
      setSearchQuery("");
      return;
    }

    if (screenView === "donors") {
      setActiveTab("donors");
      setSearchQuery("");
      return;
    }

    setActiveTab("requests");
    setSearchQuery("");
  }, [screenView]);

  // ======================================================
  // FETCH DATA
  // ======================================================

  const fetchData = async () => {
    try {
      // ==================================================
      // 1. FETCH BLOOD REQUESTS
      // ==================================================

      const requestsQuery = query(
        collection(
          db,
          "blood-requests"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

      const requestsSnapshot =
        await getDocs(
          requestsQuery
        );

      const urgentRequestList:
        any[] = [];

      requestsSnapshot.forEach(
        (document: any) => {
          const data =
            document.data();

          const status =
            data.status ||
            "Pending";

          if (
            data.requestType ===
              "Emergency" &&
            status !==
              "Completed" &&
            status !==
              "Cancelled"
          ) {
            urgentRequestList.push(
              {
                id:
                  document.id,
                ...data,
              }
            );
          }
        }
      );

      // ==================================================
      // LINK EMERGENCY RESPONSE COUNTS
      // ==================================================

      const emergencyCasesSnapshot = await getDocs(
        collection(
          db,
          "community_notifications"
        )
      );

      const emergencyMap: Record<string, any> = {};

      emergencyCasesSnapshot.forEach((document: any) => {
        const data = document.data();

        if (
          data.type === "emergency" &&
          data.emergencyId
        ) {
          emergencyMap[data.emergencyId] = {
            respondingDonorsCount:
              data.respondingDonorsCount || 0,

            donorResponses:
              data.donorResponses || [],

            emergencyStatus:
              data.status || "Active",

            reporterUid:
              data.reporterUid || "",
          };
        }
      });

      const linkedRequests = urgentRequestList.map(
        (request) => ({
          ...request,

          respondingDonorsCount:
            request.emergencyId
              ? emergencyMap[request.emergencyId]
                  ?.respondingDonorsCount || 0
              : 0,

          donorResponses:
            request.emergencyId
              ? emergencyMap[request.emergencyId]
                  ?.donorResponses || []
              : [],

          emergencyStatus:
            request.emergencyId
              ? emergencyMap[request.emergencyId]
                  ?.emergencyStatus || "Active"
              : "Active",

          reporterUid:
            request.reporterUid ||
            (request.emergencyId
              ? emergencyMap[request.emergencyId]
                  ?.reporterUid || ""
              : ""),
        })
      );

      setRequests(
        linkedRequests
      );

      // ==================================================
      // 2. FETCH MY EMERGENCY RESPONSES
      // ==================================================

      try {
        if (auth.currentUser?.uid) {
          const myResponses =
            await apiRequest<any[]>("/api/emergencies/my-responses");

          setMyEmergencyResponses(
            Array.isArray(myResponses) ? myResponses : []
          );
        } else {
          setMyEmergencyResponses([]);
        }
      } catch (responseError) {
        console.error(
          "Error fetching my emergency responses:",
          responseError
        );
        setMyEmergencyResponses([]);
      }

      // ==================================================
      // 3. FETCH AVAILABLE DONORS
      // ==================================================

      const donorsSnapshot =
        await getDocs(
          collection(
            db,
            "users"
          )
        );

      const availableDonorList:
        any[] = [];

      const liveCurrentLocation =
        await getFreshGpsLocation();

      const currentLat =
        liveCurrentLocation?.latitude ?? currentUserData?.latitude;

      const currentLng =
        liveCurrentLocation?.longitude ?? currentUserData?.longitude;

      donorsSnapshot.forEach(
        (document: any) => {
          const data =
            document.data();

          if (
            data.availableToDonate !==
              false &&
            data.role !==
              "admin" &&
            document.id !==
              auth.currentUser?.uid
          ) {
            let distance:
              number | null = null;

            if (
              typeof currentLat ===
                "number" &&
              typeof currentLng ===
                "number" &&
              typeof data.latitude ===
                "number" &&
              typeof data.longitude ===
                "number"
            ) {
              distance =
                calculateDistance(
                  currentLat,
                  currentLng,
                  data.latitude,
                  data.longitude
                );
            }

            availableDonorList.push(
              {
                id:
                  document.id,
                ...data,
                distance,
              }
            );
          }
        }
      );

      // Nearest donors first.
      // Donors without GPS location go to the bottom.
      availableDonorList.sort(
        (a, b) => {
          if (
            a.distance === null &&
            b.distance === null
          ) {
            return 0;
          }

          if (
            a.distance === null
          ) {
            return 1;
          }

          if (
            b.distance === null
          ) {
            return -1;
          }

          return (
            a.distance -
            b.distance
          );
        }
      );

      setDonors(
        availableDonorList
      );

      // ==================================================
      // INITIALIZE FILTERS
      // ==================================================

      if (
        activeTab ===
        "requests"
      ) {
        filterRequests(
          searchQuery,
          linkedRequests
        );
      } else {
        filterDonors(
          searchQuery,
          availableDonorList
        );
      }
    } catch (error) {
      console.error(
        "Error fetching emergency data:",
        error
      );
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  };

  // ======================================================
  // FETCH BLOOD BANK CONTACT (settings/bloodBank)
  // Admin-configured name/phone/address/GPS pin, shown to
  // the reporter when their emergency was fulfilled from
  // the reserve instead of a donor.
  // ======================================================

  const fetchBloodBankContact = async () => {
    try {
      const snapshot = await getDoc(doc(db, "settings", "bloodBank"));

      if (snapshot.exists()) {
        const data = snapshot.data();

        setBloodBankContact({
          name: data.name || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          latitude:
            typeof data.latitude === "number" ? data.latitude : null,
          longitude:
            typeof data.longitude === "number" ? data.longitude : null,
        });
      }
    } catch (error) {
      console.error(
        "Error fetching blood bank contact:",
        error
      );
    }
  };

  useEffect(() => {
    const initializeEmergencyScreen = async () => {
      const uid = auth.currentUser?.uid;

      if (uid) {
        const saved = await saveCurrentLocation();

        if (saved) {
          await fetchUser(uid);
        }

        // Only fetch settings/bloodBank once we know a
        // signed-in user exists — this collection's rules
        // require an authenticated, active user, and calling
        // it before Backend Auth has restored the session
        // (auth.currentUser still null) causes a permission
        // error even for users who are properly logged in.
        await fetchBloodBankContact();
      }

      await fetchData();
    };

    initializeEmergencyScreen();
  }, []);

  // ======================================================
  // LIVE DONOR DISTANCE REFRESH
  // ======================================================
  // While this screen is open, update this user's GPS in the backend
  // and reload donor coordinates every 30 seconds. This makes the
  // "KM AWAY" value change as users move (for users whose apps are
  // also updating their saved GPS location).
  useEffect(() => {
    let cancelled = false;
    let running = false;

    const refreshLiveDonorDistances = async () => {
      if (cancelled || running || !auth.currentUser?.uid) {
        return;
      }

      running = true;

      try {
        const saved = await saveCurrentLocation();

        if (saved && auth.currentUser?.uid) {
          await fetchUser(auth.currentUser.uid);
        }

        if (!cancelled) {
          await fetchData();
        }
      } catch (error) {
        console.error("Live donor distance refresh error:", error);
      } finally {
        running = false;
      }
    };

    const intervalId = setInterval(
      refreshLiveDonorDistances,
      30000
    );

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // ======================================================
  // REFRESH
  // ======================================================

  const onRefresh =
    useCallback(() => {
      setRefreshing(true);

      fetchData();
    }, [
      activeTab,
      searchQuery,
    ]);

  // ======================================================
  // FILTER REQUESTS
  // ======================================================

  const filterRequests = (
    queryText: string,
    list = requests
  ) => {
    const currentUid = auth.currentUser?.uid;

    if (
      queryText.trim() === ""
    ) {
      const sortedRequests = [...list].sort((a, b) => {
        const aIsMine = a.reporterUid === currentUid;
        const bIsMine = b.reporterUid === currentUid;

        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        return 0;
      });

      setFilteredRequests(
        sortedRequests
      );

      return;
    }

    const q =
      queryText.toLowerCase();

      const filtered =
      list.filter(
        (req) =>
          req.patientName
            ?.toLowerCase()
            .includes(q) ||
          req.bloodType
            ?.toLowerCase()
            .includes(q) ||
          req.hospitalName
            ?.toLowerCase()
            .includes(q) ||
          req.location
            ?.toLowerCase()
            .includes(q)
      );

    // Always keep the logged-in user's own emergencies
    // together at the top. Other users' emergencies stay
    // in a separate group below them.
    const sortedRequests = [...filtered].sort((a, b) => {
      const aIsMine = a.reporterUid === currentUid;
      const bIsMine = b.reporterUid === currentUid;

      if (aIsMine && !bIsMine) return -1;
      if (!aIsMine && bIsMine) return 1;
      return 0;
    });

    setFilteredRequests(
      sortedRequests
    );
  };

  // ======================================================
  // FILTER DONORS
  // ======================================================

  const filterDonors = (
    queryText: string,
    list = donors
  ) => {
    if (
      queryText.trim() === ""
    ) {
      setFilteredDonors(
        list
      );

      return;
    }

    const q =
      queryText.toLowerCase();

    const filtered =
      list.filter(
        (donor) =>
          donor.fullName
            ?.toLowerCase()
            .includes(q) ||
          donor.phoneNumber
            ?.includes(q) ||
          donor.bloodType
            ?.toLowerCase()
            .includes(q) ||
          donor.location
            ?.toLowerCase()
            .includes(q)
      );

    setFilteredDonors(
      filtered
    );
  };

  // ======================================================
  // SEARCH
  // ======================================================

  const handleSearch = (
    text: string
  ) => {
    setSearchQuery(text);

    if (
      activeTab ===
      "requests"
    ) {
      filterRequests(text);
    } else {
      filterDonors(text);
    }
  };

  // ======================================================
  // CHANGE TAB
  // ======================================================

  const handleTabChange = (
    tab:
      | "requests"
      | "donors"
  ) => {
    setActiveTab(tab);

    setSearchQuery("");

    if (
      tab === "requests"
    ) {
      filterRequests(
        "",
        requests
      );
    } else {
      setFilteredDonors(
        donors
      );
    }
  };

  // ======================================================
  // CALL
  // ======================================================

  const handleCall = (
    phoneNumber: string
  ) => {
    if (!phoneNumber) {
      Alert.alert(
        "Error",
        "Contact number not available."
      );

      return;
    }

    const sanitizedNumber =
      phoneNumber.replace(
        /[^\d+]/g,
        ""
      );

    const url =
      `tel:${sanitizedNumber}`;

    Linking.openURL(
      url
    ).catch((err) => {
      console.error(
        "An error occurred opening dialer:",
        err
      );

      Alert.alert(
        "Error",
        "Phone calls are not supported on this device."
      );
    });
  };

  // ======================================================
  // OPEN BLOOD BANK LOCATION
  // Prefers the admin-set GPS pin (exact) and falls back to
  // an address text search if no pin was set.
  // ======================================================

  const handleOpenBloodBankLocation = () => {
    if (!bloodBankContact) {
      return;
    }

    const {
      latitude,
      longitude,
      address,
    } = bloodBankContact;

    const url =
      typeof latitude === "number" &&
      typeof longitude === "number"
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : address
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
          : null;

    if (!url) {
      Alert.alert(
        "Location Not Available",
        "The blood bank has not set an address or location yet."
      );

      return;
    }

    Linking.openURL(url).catch((err) => {
      console.error(
        "An error occurred opening maps:",
        err
      );

      Alert.alert(
        "Error",
        "Could not open maps."
      );
    });
  };

  // ======================================================
  // I CAN HELP - ASP.NET Core API
  // ======================================================

  const handleCanHelp = async (request: any) => {
    try {
      const currentUid = auth.currentUser?.uid;

      if (!currentUid) {
        Alert.alert("Login Required", "Please login to respond to this emergency.");
        return;
      }

      if (request.reporterUid && request.reporterUid === currentUid) {
        Alert.alert("Your Emergency", "You cannot respond to your own emergency request.");
        return;
      }

      const emergencyId =
        request.emergencyId ||
        request.emergencyRequestId ||
        request.referenceId ||
        request.id;

      if (!emergencyId) {
        Alert.alert("Emergency Not Found", "Emergency ID is missing.");
        return;
      }

      if (currentUserData?.availableToDonate === false) {
        Alert.alert("Donor Unavailable", "Your donor profile is currently marked unavailable.");
        return;
      }

      const createdResponse = await apiRequest<any>(
        `/api/emergencies/${emergencyId}/respond`,
        {
          method: "POST",
        }
      );

      if (createdResponse) {
        setMyEmergencyResponses((previous) => {
          const withoutCurrent = previous.filter(
            (item: any) =>
              String(item.emergencyRequestId || item.emergencyId) !==
              String(emergencyId)
          );

          return [...withoutCurrent, createdResponse];
        });
      }

      Alert.alert(
        "Thank You ❤️",
        "Your response has been sent successfully.\n\nPlease contact the emergency requester as soon as possible."
      );

      await fetchData();
    } catch (error: any) {
      console.error("Error responding to emergency:", error);
      Alert.alert(
        "Error",
        error?.message || "Could not send your response. Please try again."
      );
    }
  };

  // ======================================================
  // UPDATE DONOR RESPONSE STATUS - ASP.NET Core API
  // ======================================================

  const handleUpdateResponseStatus = async (
    request: any,
    newStatus: "On The Way" | "Arrived" | "Completed"
  ) => {
    try {
      const currentUid = auth.currentUser?.uid;
      const emergencyId =
        request.emergencyId || request.emergencyRequestId || request.referenceId || request.id;

      if (!currentUid || !emergencyId) return;

      const myResponses = await apiRequest<any[]>("/api/emergencies/my-responses");
      const currentResponse = (myResponses || []).find((response: any) =>
        String(response.emergencyRequestId || response.emergencyId) === String(emergencyId)
      );

      if (!currentResponse?.id) {
        Alert.alert(
          "Response Not Found",
          "Please press I Can Help before updating your response status."
        );
        return;
      }

      await apiRequest(`/api/emergencies/responses/${currentResponse.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      setMyEmergencyResponses((previous) =>
        previous.map((item: any) =>
          String(item.id) === String(currentResponse.id)
            ? {
                ...item,
                status: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );

      if (newStatus === "Arrived") {
        Alert.alert("You've Arrived 📍", "The emergency reporter has been notified that you've arrived.");
      } else if (newStatus === "On The Way") {
        Alert.alert("Status Updated", "The emergency reporter has been notified that you're on the way.");
      } else {
        Alert.alert("Status Updated", `Your emergency response status is now "${newStatus}".`);
      }

      await fetchData();
    } catch (error: any) {
      console.error("Error updating response status:", error);
      Alert.alert("Error", error?.message || "Could not update response status.");
    }
  };

  // ======================================================
  // VIEW RESPONDING DONORS - ASP.NET Core API
  // ======================================================

  const handleViewResponders = async (request: any) => {
    const emergencyId =
      request.emergencyId || request.emergencyRequestId || request.referenceId || request.id;

    if (!emergencyId) {
      Alert.alert("Not Available", "Emergency ID is missing.");
      return;
    }

    try {
      const responses = await apiRequest<any[]>(`/api/emergencies/${emergencyId}/responses`);
      setSelectedResponders(responses || []);
      setSelectedEmergencyId(String(emergencyId));
      setRespondersModalVisible(true);
    } catch (error: any) {
      console.error("Error loading emergency responders:", error);
      Alert.alert("Error", error?.message || "Could not load responding donors.");
    }
  };

  // ======================================================
  // FIND NEARBY DONORS FOR A SPECIFIC EMERGENCY
  // ======================================================

  const handleFindNearbyDonors = (
    request: any
  ) => {
    if (
      typeof request.latitude !== "number" ||
      typeof request.longitude !== "number"
    ) {
      Alert.alert(
        "Location Not Available",
        "This emergency does not have GPS coordinates yet."
      );

      return;
    }

    const requiredBloodType =
      request.bloodType || "ANY";

    const matchedDonors = donors
      .filter((donor) => {
        const hasGps =
          typeof donor.latitude === "number" &&
          typeof donor.longitude === "number";

        const isAvailable =
          donor.availableToDonate !== false;

        const bloodMatches =
          requiredBloodType === "ANY" ||
          donor.bloodType === requiredBloodType;

        return (
          hasGps &&
          isAvailable &&
          bloodMatches
        );
      })
      .map((donor) => ({
        ...donor,

        emergencyDistance:
          calculateDistance(
            request.latitude,
            request.longitude,
            donor.latitude,
            donor.longitude
          ),
      }))
      .sort(
        (a, b) =>
          a.emergencyDistance -
          b.emergencyDistance
      );

    setNearbyDonors(
      matchedDonors
    );

    setSelectedNearbyEmergencyId(
      request.emergencyId || ""
    );

    setSelectedNearbyBloodType(
      requiredBloodType
    );

    setNearbyDonorsModalVisible(
      true
    );
  };

  // ======================================================
  // OPEN EMERGENCY MODAL
  // ======================================================

  const openReportModal = (
    category: string
  ) => {
    setSelectedCategory(
      category
    );

    setReportLocation(
      currentUserData
        ?.location ||
        ""
    );

    setReportPhone(
      currentUserData
        ?.phoneNumber ||
        ""
    );

    setReportBloodType(
      "ANY"
    );

    setReportPriority(
      CategoryDefaultPriority[
        category
      ] || "Critical"
    );

    setReportNotes("");

    setShowBloodTypePicker(
      false
    );

    setReportModalVisible(
      true
    );
  };

  // ======================================================
  // SEND EMERGENCY ALERT
  // ======================================================

  const handleSendEmergencyAlert =
    async () => {
      const pakPhoneRegex =
        /^(?:\+92|0)3\d{9}$/;

      if (
        !reportLocation.trim()
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter location of the emergency."
        );

        return;
      }

      if (
        !reportPhone.trim()
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter contact phone number."
        );

        return;
      }

      if (
        !pakPhoneRegex.test(
          reportPhone
        )
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid Pakistani phone number (e.g. +923XXXXXXXXX or 03XXXXXXXXX)."
        );

        return;
      }

      setSubmitLoading(
        true
      );

      try {
        const currentUid =
          auth.currentUser
            ?.uid || "";

        const currentUserName =
          currentUserData
            ?.fullName ||
          auth.currentUser
            ?.displayName ||
          "A Hero";

        // ==================================================
        // CREATE EMERGENCY ID
        // ==================================================

        let emergencyId = "";

        // ==================================================
        // CATEGORY ICON
        // ==================================================

        const categoryObj =
          EmergencyCategories.find(
            (c) =>
              c.label ===
              selectedCategory
          );

        const icon =
          categoryObj
            ?.label ===
          "Fire"
            ? "flame"
            : "alert-circle";

        // ==================================================
        // PRIORITY INFO
        // ==================================================

        const priorityObj =
          PriorityLevels.find(
            (p) =>
              p.label ===
              reportPriority
          ) ||
          PriorityLevels[0];

        const unitsNeeded =
          priorityObj.unitsNeeded;

        // ==================================================
        // GPS LOCATION
        // Grab a fresh GPS fix at the moment of reporting.
        // Falls back to the last saved profile coordinates
        // if permission is denied or the fix fails.
        // ==================================================

        const freshGps =
          await getFreshGpsLocation();

        const emergencyLatitude =
          freshGps?.latitude ??
          currentUserData?.latitude ??
          null;

        const emergencyLongitude =
          freshGps?.longitude ??
          currentUserData?.longitude ??
          null;

        // ==================================================
        // CHECK BLOOD RESERVE
        // Available     -> units deducted from stock, no
        //                  donor broadcast is needed.
        // Not Available -> fall through to Find Donors below.
        // ==================================================

        // Reservation is now performed atomically by the ASP.NET Core API
        // when the emergency is created. This prevents the mobile app from
        // deducting inventory twice.
        let reserveResult = {
          reserved: false,
          availableUnits: 0,
          remainingUnits: 0,
        };

        let bloodSource = "Community Donors";

        // ==================================================
        // 1. COMMUNITY EMERGENCY DOCUMENT
        // ==================================================

        const newAlert = {
          emergencyId:
            emergencyId,

          type:
            "emergency",

          status:
            reserveResult.reserved
              ? "Blood Reserved"
              : "Active",

          // Emergency Information
          category:
            selectedCategory,

          priority:
            reportPriority,

          bloodType:
            reportBloodType,

          unitsNeeded:
            unitsNeeded,

          // Check Blood Reserve outcome
          bloodSource:
            bloodSource,

          reservedUnits:
            reserveResult.reserved
              ? unitsNeeded
              : 0,

          location:
            reportLocation,

          latitude:
            emergencyLatitude,

          longitude:
            emergencyLongitude,

          phoneNumber:
            reportPhone,

          details:
            reportNotes ||
            "",

          // Reporter Information
          reporterUid:
            currentUid,

          reporterName:
            currentUserName,

          // Donor Tracking
          donorResponses:
            [],

          respondingDonorsCount:
            0,

          // Notification
          title:
            `${reportPriority.toUpperCase()}: ${selectedCategory} Alert! 🚨`,

          message:
            reserveResult.reserved
              ? `Emergency (${selectedCategory}) reported at ${reportLocation}. ${unitsNeeded} unit(s) of ${reportBloodType} blood reserved from the blood bank.`
              : `Emergency (${selectedCategory}) reported. Blood needed immediately at ${reportLocation}!`,

          unread:
            true,

          icon:
            icon,

          color:
            priorityObj.color,

          // Auto-Delete (2 days from now, handled by a
          // backend database TTL policy on this field)
          expireAt:
            getExpiryTimestamp(),

          // Tracking
          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

          resolvedAt:
            null,
        };

        const createdEmergency = await addDoc(
          collection(
            db,
            "community_notifications"
          ),
          newAlert
        );

        emergencyId = String(createdEmergency.id);

        const createdEmergencyData = createdEmergency.data?.() || {};
        reserveResult = {
          reserved: createdEmergencyData.bloodSource === "Blood Bank Reserve",
          availableUnits: Number(createdEmergencyData.reservedUnits || 0),
          remainingUnits: 0,
        };
        bloodSource = createdEmergencyData.bloodSource || "Community Donors";

        // Push notifications are handled by the ASP.NET Core backend.
        // Do not send Expo push notifications directly from the mobile app.

        const continueAfterSubmission = () => {
          fetchData();
          setActiveTab("requests");
          setRequestSubView("my");
          router.replace("/home/emergency?view=requests" as any);
        };

        if (reserveResult.reserved) {
          setReportModalVisible(false);
          setReservedDialog({
            emergencyId,
            unitsNeeded,
            bloodType: reportBloodType,
            onDone: continueAfterSubmission,
          });
        } else {
          setReportModalVisible(false);
          continueAfterSubmission();
        }
      } catch (error) {
        console.error(
          "Error creating emergency alert:",
          error
        );

        Alert.alert(
          "Error",
          "Could not send emergency alert. Please try again."
        );
      } finally {
        setSubmitLoading(
          false
        );
      }
    };

  // ======================================================
  // MARK EMERGENCY RESOLVED (Reporter action)
  // Final step of the flow: Completed responses -> the
  // reporter closes out the case as Resolved.
  // ======================================================

  const handleResolveEmergency = async (
    request: any
  ) => {
    if (!request.emergencyId) {
      Alert.alert(
        "Not Available",
        "This emergency cannot be resolved from here."
      );

      return;
    }

    Alert.alert(
      "Resolve Emergency",
      "Are you sure this emergency has been handled and can be marked as resolved?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Resolve",
          onPress: async () => {
            try {
              await apiRequest(`/api/emergencies/${request.emergencyId}/resolve`, {
                method: "PATCH",
              });

              // Remove only the community-notification mirror. The backend
              // has already released reserved stock, completed the linked
              // blood request, and sent donor notifications.
              try {
                const mirrorSnapshot = await getDocs(
                  query(
                    collection(db, "community_notifications"),
                    where("emergencyId", "==", request.emergencyId),
                  ),
                );
                await Promise.all(
                  mirrorSnapshot.docs.map((item) =>
                    apiRequest(`/api/community-notifications/${item.id}`, { method: "DELETE" }),
                  ),
                );
              } catch (mirrorError) {
                console.warn("Could not remove emergency mirror:", mirrorError);
              }

              Alert.alert(
                "Emergency Resolved",
                "This emergency has been marked as resolved and removed. Thank you for using Blood Care.",
              );
              fetchData();
            } catch (error) {
              console.error(
                "Error resolving emergency:",
                error
              );

              Alert.alert(
                "Error",
                "Could not resolve this emergency. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleCancelEmergency = async (request: any) => {
    if (!request.emergencyId) {
      Alert.alert("Not Available", "This emergency cannot be cancelled from here.");
      return;
    }

    Alert.alert(
      "Cancel Emergency",
      "Are you sure you want to cancel this emergency?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Emergency",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/api/emergencies/${request.emergencyId}/cancel`, {
                method: "PATCH",
              });

              Alert.alert(
                "Emergency Cancelled",
                "The emergency was cancelled successfully.",
              );
              fetchData();
            } catch (error) {
              console.error("Error cancelling emergency:", error);
              Alert.alert("Error", "Could not cancel this emergency. Please try again.");
            }
          },
        },
      ],
    );
  };

  // ======================================================
  // TIME AGO
  // ======================================================

  const getTimeAgo = (
    timestamp: any
  ) => {
    if (!timestamp) {
      return "Just now";
    }

    const date =
      timestamp.toDate
        ? timestamp.toDate()
        : new Date(
            timestamp
          );

    const seconds =
      Math.floor(
        (
          new Date().getTime() -
          date.getTime()
        ) / 1000
      );

    let interval =
      seconds /
      31536000;

    if (
      interval > 1
    ) {
      return (
        Math.floor(
          interval
        ) +
        " years ago"
      );
    }

    interval =
      seconds /
      2592000;

    if (
      interval > 1
    ) {
      return (
        Math.floor(
          interval
        ) +
        " months ago"
      );
    }

    interval =
      seconds /
      86400;

    if (
      interval > 1
    ) {
      return (
        Math.floor(
          interval
        ) +
        " days ago"
      );
    }

    interval =
      seconds /
      3600;

    if (
      interval > 1
    ) {
      return (
        Math.floor(
          interval
        ) +
        " hours ago"
      );
    }

    interval =
      seconds /
      60;

    if (
      interval > 1
    ) {
      return (
        Math.floor(
          interval
        ) +
        " mins ago"
      );
    }

    return (
      Math.floor(
        seconds
      ) +
      " secs ago"
    );
  };

  // ======================================================
  // UI
  // ======================================================

  const openEmergencyInterface = (target: "requests" | "donors") => {
    router.push(`/home/emergency?view=${target}` as any);
  };

  const renderHome = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 40,
      }}
    >
      {/* QUICK EMERGENCY REPORT */}
     <View className="bg-slate-50 pb-4">
        <View className="mb-3 flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
            <Ionicons
              name="megaphone-outline"
              size={22}
             color="#E63946"
            />
          </View>

          <View className="flex-1">
           <Text className="text-lg font-extrabold text-slate-900">
              Quick Emergency Report
            </Text>

           <Text className="mt-0.5 text-xs font-medium leading-4 text-slate-500">
              Select an emergency type to alert nearby donors.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {EmergencyCategories.map((item, index) => {
            const isLast = index === EmergencyCategories.length - 1;

            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => openReportModal(item.label)}
                activeOpacity={0.82}
                className={
                  isLast
                    ? "w-full flex-row items-center justify-center rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5"
                    : "w-[31.5%] items-center rounded-2xl border border-slate-200 bg-white px-2 py-3"
                }
              >
                <View
                  className={
                    isLast
                      ? "mr-2 h-8 w-8 items-center justify-center rounded-xl bg-white"
                      : "mb-1 h-8 w-8 items-center justify-center rounded-xl bg-white"
                  }
                >
                  <Ionicons
                    name={item.icon as any}
                    size={19}
                    color="#E63946"
                  />
                </View>

                <Text
                  className={
                    isLast
                      ? "text-center text-[11px] font-bold uppercase tracking-wide text-red-700"
                    : "text-center text-[10px] font-bold uppercase leading-4 tracking-wide text-slate-800"
                  }
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* EMERGENCY SUPPORT OPTIONS */}
      <View className="mt-4 items-center px-2 pb-4 pt-2">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-3xl bg-red-50">
          <Ionicons name="medkit-outline" size={30} color="#E63946" />
        </View>

       <Text className="text-center text-2xl font-extrabold text-slate-900">
          Emergency Support
        </Text>

        <Text className="mt-1.5 text-center text-sm font-medium leading-5 text-slate-500">
          Choose an option below to view urgent blood requests or available donors.
        </Text>
        
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openEmergencyInterface("requests")}
        className="mb-4 overflow-hidden rounded-3xl border border-red-100 bg-red-50/70 px-5 py-4"
      >
        <View className="flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Ionicons name="warning-outline" size={28} color="#E63946" />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-lg font-black text-slate-900">
              Urgent Donor Requests
            </Text>
            <Text className="mt-1 text-xs font-medium leading-4 text-gray-500">
              View active emergency blood requests and respond to people who need help.
            </Text>
          </View>

          <View className="ml-2 items-center">
            <View className="min-w-[34px] items-center rounded-full bg-[#E63946] px-2.5 py-1.5">
              <Text className="text-xs font-black text-white">
                {requests.length}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#DC2626"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openEmergencyInterface("donors")}
        className="overflow-hidden rounded-3xl border border-green-100 bg-green-50/70 px-5 py-4"
      >
        <View className="flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Ionicons name="people-outline" size={28} color="#16A34A" />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-lg font-extrabold text-gray-900">
              Ready Donors
            </Text>
            <Text className="mt-1 text-xs font-medium leading-4 text-gray-500">
              Find available blood donors near you and contact them directly.
            </Text>
          </View>

          <View className="ml-2 items-center">
            <View className="min-w-[34px] items-center rounded-full bg-green-600 px-2.5 py-1.5">
              <Text className="text-xs font-black text-white">
                {donors.length}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#16A34A"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  // Requests filtered down to only the group selected via the
  // My Requests / Community toggle above the list.
  const visibleRequests = React.useMemo(() => {
    const currentUid = auth.currentUser?.uid;
    return filteredRequests.filter((item) =>
      requestSubView === "my"
        ? item.reporterUid === currentUid
        : item.reporterUid !== currentUid &&
          item.bloodSource !== "Blood Bank Reserve",
    );
  }, [filteredRequests, requestSubView]);

  const myRequestsCount = React.useMemo(() => {
    const currentUid = auth.currentUser?.uid;
    return filteredRequests.filter(
      (item) => item.reporterUid === currentUid,
    ).length;
  }, [filteredRequests]);

  const communityRequestsCount = React.useMemo(() => {
    const currentUid = auth.currentUser?.uid;
    return filteredRequests.filter(
      (item) =>
        item.reporterUid !== currentUid &&
        item.bloodSource !== "Blood Bank Reserve",
    ).length;
  }, [filteredRequests]);

  const renderInterface = () => (
    <>
      <View className="px-4 pb-2 pt-4">
        <View className="flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4">
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />

          <TextInput
            className="ml-3 h-12 flex-1 text-sm font-semibold text-gray-900"
            placeholder={
              activeTab === "requests"
                ? "Search urgent requests..."
                : "Search ready donors..."
            }
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
          />

          {searchQuery !== "" && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSearch("")}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {activeTab === "requests" && (
          <View className="mt-4 flex-row rounded-2xl border border-gray-100 bg-gray-50 p-1">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setRequestSubView("my")}
              className={`flex-1 flex-row items-center justify-center rounded-xl py-3 ${
                requestSubView === "my" ? "bg-red-600" : "bg-transparent"
              }`}
            >
              <Ionicons
                name={requestSubView === "my" ? "person" : "person-outline"}
                size={15}
                color={requestSubView === "my" ? "#FFFFFF" : "#9CA3AF"}
              />
              <Text
                className={`ml-1.5 text-xs font-black tracking-wide ${
                  requestSubView === "my" ? "text-white" : "text-gray-400"
                }`}
              >
                My Requests
              </Text>
              <View
                className={`ml-1.5 min-w-[20px] items-center rounded-full px-1.5 py-0.5 ${
                  requestSubView === "my" ? "bg-red-800" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    requestSubView === "my" ? "text-white" : "text-gray-500"
                  }`}
                >
                  {myRequestsCount}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setRequestSubView("community")}
              className={`flex-1 flex-row items-center justify-center rounded-xl py-3 ${
                requestSubView === "community" ? "bg-blue-600" : "bg-transparent"
              }`}
            >
              <Ionicons
                name={requestSubView === "community" ? "people" : "people-outline"}
                size={15}
                color={requestSubView === "community" ? "#FFFFFF" : "#9CA3AF"}
              />
              <Text
                className={`ml-1.5 text-xs font-black tracking-wide ${
                  requestSubView === "community" ? "text-white" : "text-gray-400"
                }`}
              >
                Community
              </Text>
              <View
                className={`ml-1.5 min-w-[20px] items-center rounded-full px-1.5 py-0.5 ${
                  requestSubView === "community" ? "bg-blue-800" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    requestSubView === "community" ? "text-white" : "text-gray-500"
                  }`}
                >
                  {communityRequestsCount}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#DC2626" />
          <Text className="mt-4 font-medium text-gray-400">
            Fetching active data...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 36,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#DC2626"]}
            />
          }
        >
          {activeTab === "requests" ? (
            visibleRequests.length > 0 ? (
              visibleRequests.map((req, index) => {
                const currentUid = auth.currentUser?.uid;
                const isMyEmergency = req.reporterUid === currentUid;

                
                const displayName =
                  req.reporterName ||
                  req.patientName ||
                  "Community Member";

                const requestedByName =
                  req.reporterName &&
                  req.reporterName !== displayName
                    ? req.reporterName
                    : undefined;

                const hospitalName = req.hospitalName?.trim() || "";
                const requestLocation = req.location?.split("|")[0]?.trim() || "";
                const displayLocation =
                  hospitalName &&
                  requestLocation &&
                  hospitalName.toLowerCase() === requestLocation.toLowerCase()
                    ? hospitalName
                    : [hospitalName, requestLocation].filter(Boolean).join(", ");

                return (
                  <React.Fragment key={req.id}>
                    <View className="mb-4 overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-sm">
                      <BloodRequestCard
                        patientName={displayName}
                        bloodType={req.bloodType}
                        location={displayLocation}
                        timeAgo={getTimeAgo(req.createdAt)}
                        isUrgent={true}
                        avatarUrl={req.avatarUrl}
                        gender={req.gender}
                        units={req.unitsNeeded}
                        reporterName={requestedByName}
                        avatarName={
                          req.requestType === "Emergency"
                            ? req.reporterName || req.patientName || displayName
                            : req.patientName
                        }
                        onCallPress={() => handleCall(req.contactPhone)}
                        showCallButton={!isMyEmergency}
                        bare
                      />

                      {req.requestType === "Emergency" && req.emergencyId && (
                        <View className="border-t border-gray-100 px-4 py-3">
                          {/* ==============================================
                              META STRIP
                              A single calm row for secondary info (who's
                              responding, priority, where the blood came
                              from) instead of several separate colored
                              pills competing for attention.
                          ============================================== */}
                          {(isMyEmergency ||
                            (req.urgency && !isMyEmergency)) && (
                            <View className="mb-3 flex-row flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-gray-50 px-3 py-2.5">
                              {isMyEmergency && (
                                <View className="flex-row items-center">
                                  <Ionicons
                                    name="people-outline"
                                    size={14}
                                    color="#6B7280"
                                  />
                                  <Text className="ml-1.5 text-xs font-bold text-gray-600">
                                    {req.respondingDonorsCount || 0} responding
                                  </Text>
                                </View>
                              )}

                              {req.urgency && !isMyEmergency && (
                                <View className="flex-row items-center">
                                  <Ionicons
                                    name="flag-outline"
                                    size={14}
                                    color="#6B7280"
                                  />
                                  <Text className="ml-1.5 text-xs font-bold text-gray-600">
                                    Priority: {req.urgency}
                                  </Text>
                                </View>
                              )}

                              {req.bloodSource && isMyEmergency && (
                                <View className="flex-row items-center">
                                  <Ionicons
                                    name={
                                      req.bloodSource ===
                                      "Blood Bank Reserve"
                                        ? "business-outline"
                                        : "people-circle-outline"
                                    }
                                    size={14}
                                    color="#6B7280"
                                  />
                                  <Text className="ml-1.5 text-xs font-bold text-gray-600">
                                    {req.bloodSource === "Blood Bank Reserve"
                                      ? "Reserved from blood bank"
                                      : "Sourced from donors"}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* ==============================================
                              RESERVED BLOOD — BLOOD BANK CONTACT
                              Shown ONLY to the reporter of THIS request,
                              and ONLY when it was fulfilled from the
                              reserve. Nobody else (community viewers,
                              other donors) sees this contact card.
                          ============================================== */}
                          {req.bloodSource === "Blood Bank Reserve" &&
                            req.reporterUid === auth.currentUser?.uid && (
                              <View className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                                <View className="mb-2 flex-row items-center">
                                  <Ionicons name="business-outline" size={16} color="#2563EB" />
                                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-blue-700">
                                    {bloodBankContact?.name || "Contact Blood Bank"}
                                  </Text>
                                </View>

                                <Text className="mb-3 text-xs font-semibold text-gray-600">
                                  {bloodBankContact?.address ||
                                    "Address not set by admin yet"}
                                </Text>

                                <View className="flex-row gap-2">
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      handleCall(bloodBankContact?.phoneNumber || "")
                                    }
                                    className="flex-1 flex-row items-center justify-center rounded-xl bg-green-600 py-3"
                                  >
                                    <Ionicons name="call" size={16} color="white" />
                                    <Text className="ml-2 text-xs font-black text-white">
                                      Call Blood Bank
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={handleOpenBloodBankLocation}
                                    className="h-11 w-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50"
                                  >
                                    <Ionicons name="navigate" size={18} color="#EA580C" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}

                          {/* ==============================================
                              REPORTER TOOLS
                              Grouped side-by-side as one compact action
                              row instead of two full-width colored banners.
                          ============================================== */}
                          {(() => {
                            const showViewResponders =
                              isMyEmergency &&
                              (req.respondingDonorsCount || 0) > 0;

                            const showFindDonors =
                              isMyEmergency &&
                              req.bloodSource !== "Blood Bank Reserve";

                            if (!showViewResponders && !showFindDonors) {
                              return null;
                            }

                            return (
                              <View className="mb-2 flex-row gap-2">
                                {showViewResponders && (
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => handleViewResponders(req)}
                                    className="flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 bg-white py-3"
                                  >
                                    <Ionicons
                                      name="people-circle-outline"
                                      size={17}
                                      color="#374151"
                                    />
                                    <Text className="ml-1.5 text-xs font-bold text-gray-700">
                                      Responders
                                    </Text>
                                  </TouchableOpacity>
                                )}

                                {showFindDonors && (
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => handleFindNearbyDonors(req)}
                                    className="flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 bg-white py-3"
                                  >
                                    <Ionicons
                                      name="navigate-outline"
                                      size={17}
                                      color="#374151"
                                    />
                                    <Text className="ml-1.5 text-xs font-bold text-gray-700">
                                      Find Donors
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })()}

                          {req.reporterUid === auth.currentUser?.uid &&
                            req.emergencyStatus !== "Resolved" && (
                              <View className="gap-2">
                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  onPress={() => handleResolveEmergency(req)}
                                  className="flex-row items-center justify-center rounded-2xl bg-gray-900 py-3.5"
                                >
                                  <Ionicons name="checkmark-done-outline" size={20} color="white" />
                                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                                    Mark Emergency Resolved
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  onPress={() => handleCancelEmergency(req)}
                                  className="flex-row items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-3.5"
                                >
                                  <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-red-600">
                                    Cancel Emergency
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}

                          {req.reporterUid === auth.currentUser?.uid &&
                            req.emergencyStatus === "Resolved" && (
                              <View className="flex-row items-center justify-center rounded-2xl bg-green-50 py-3.5">
                                <Ionicons name="checkmark-done-circle" size={19} color="#16A34A" />
                                <Text className="ml-2 text-xs font-black uppercase tracking-wider text-green-700">
                                  Emergency Resolved
                                </Text>
                              </View>
                            )}

                          {req.reporterUid !== auth.currentUser?.uid &&
                            (() => {
                              const emergencyId =
                                req.emergencyId ||
                                req.emergencyRequestId ||
                                req.referenceId ||
                                req.id;

                              const myResponse = myEmergencyResponses.find(
                                (response: any) =>
                                  String(
                                    response.emergencyRequestId ||
                                      response.emergencyId
                                  ) === String(emergencyId)
                              );

                              if (!myResponse) {
                                return (
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => handleCanHelp(req)}
                                    className="flex-row items-center justify-center rounded-2xl bg-green-600 py-4"
                                  >
                                    <Ionicons name="hand-right-outline" size={20} color="white" />
                                    <Text className="ml-2 text-sm font-black uppercase tracking-wider text-white">
                                      I Can Help
                                    </Text>
                                  </TouchableOpacity>
                                );
                              }

                              const currentStatus =
                                myResponse.status || myResponse.response || "Accepted";

                              return (
                                <View className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                                  <View className="mb-3 flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                      <Ionicons name="pulse-outline" size={18} color="#2563EB" />
                                      <Text className="ml-2 text-xs font-black uppercase tracking-wider text-gray-700">
                                        My Response
                                      </Text>
                                    </View>
                                    <View
                                      className={`rounded-full px-3 py-1 ${
                                        currentStatus === "Completed"
                                          ? "bg-green-100"
                                          : currentStatus === "Arrived"
                                            ? "bg-purple-100"
                                            : currentStatus === "On The Way"
                                              ? "bg-blue-100"
                                              : "bg-yellow-100"
                                      }`}
                                    >
                                      <Text
                                        className={`text-[10px] font-black uppercase ${
                                          currentStatus === "Completed"
                                            ? "text-green-700"
                                            : currentStatus === "Arrived"
                                              ? "text-purple-700"
                                              : currentStatus === "On The Way"
                                                ? "text-blue-700"
                                                : "text-yellow-700"
                                        }`}
                                      >
                                        {currentStatus}
                                      </Text>
                                    </View>
                                  </View>

                                  {currentStatus === "Accepted" && (
                                    <TouchableOpacity
                                      activeOpacity={0.85}
                                      onPress={() => handleUpdateResponseStatus(req, "On The Way")}
                                      className="flex-row items-center justify-center rounded-xl bg-blue-600 py-3.5"
                                    >
                                      <Ionicons name="navigate" size={18} color="white" />
                                      <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                                        Start Journey
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  {currentStatus === "On The Way" && (
                                    <TouchableOpacity
                                      activeOpacity={0.85}
                                      onPress={() => handleUpdateResponseStatus(req, "Arrived")}
                                      className="flex-row items-center justify-center rounded-xl bg-purple-600 py-3.5"
                                    >
                                      <Ionicons name="location" size={18} color="white" />
                                      <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                                        I've Arrived
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  {currentStatus === "Arrived" && (
                                    <TouchableOpacity
                                      activeOpacity={0.85}
                                      onPress={() => handleUpdateResponseStatus(req, "Completed")}
                                      className="flex-row items-center justify-center rounded-xl bg-green-600 py-3.5"
                                    >
                                      <Ionicons name="checkmark-circle" size={18} color="white" />
                                      <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                                        Complete Response
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  {currentStatus === "Completed" && (
                                    <View className="flex-row items-center justify-center rounded-xl bg-green-50 py-3.5">
                                      <Ionicons name="checkmark-circle" size={19} color="#16A34A" />
                                      <Text className="ml-2 text-xs font-black uppercase tracking-wider text-green-700">
                                        Response Completed
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })()}
                        </View>
                      )}
                    </View>
                  </React.Fragment>
                );
              })
            ) : (
              <View className="items-center justify-center px-6 py-20">
                <Ionicons name="alert-circle-outline" size={80} color="#F3F4F6" />
                <Text className="mt-4 text-center text-lg font-bold text-gray-400">
                  {requestSubView === "my"
                    ? "No Requests Reported By You"
                    : "No Community Requests"}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-300">
                  {requestSubView === "my"
                    ? "You haven't reported any emergency blood requests yet."
                    : "Currently there are no critical or urgent requests from other users."}
                </Text>
              </View>
            )
          ) : filteredDonors.length > 0 ? (
            filteredDonors.map((donor) => (
              <Donorcard
                key={donor.id}
                fullName={donor.fullName}
                bloodType={donor.bloodType}
                location={donor.location || "Location unavailable"}
                distance={donor.distance}
                latitude={donor.latitude ?? null}
                longitude={donor.longitude ?? null}
                donationsCount={donor.donationsCount || 0}
                rating={donor.rating || 5.0}
                isAvailable={true}
                avatarUrl={donor.avatarUrl}
                gender={donor.gender}
                onPress={() =>
                  router.push({
                    pathname: "/donor/[id]",
                    params: { id: String(donor.id) },
                  })
                }
                onCallPress={() => handleCall(donor.phoneNumber)}
                onMapPress={() => {
                  if (
                    typeof donor.latitude === "number" &&
                    typeof donor.longitude === "number"
                  ) {
                    const url = `https://www.google.com/maps?q=${donor.latitude},${donor.longitude}`;
                    Linking.openURL(url);
                  }
                }}
              />
            ))
          ) : (
            <View className="items-center justify-center px-6 py-20">
              <Ionicons name="people-outline" size={80} color="#F3F4F6" />
              <Text className="mt-4 text-center text-lg font-bold text-gray-400">
                No Ready Donors Found
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-300">
                Try searching by blood type or location.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <StatusBar barStyle="dark-content" />

      {screenView === "home" ? (
        renderHome()
      ) : (
        renderInterface()
      )}

      <Modal
        visible={reservedDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-[380px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <View className="items-center bg-red-600 px-6 pb-6 pt-7">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <Ionicons name="checkmark-circle" size={42} color="#FFFFFF" />
              </View>
              <Text className="mt-4 text-center text-2xl font-black text-white">
                Blood Reserved
              </Text>
              <Text className="mt-1 text-center text-sm font-semibold text-red-100">
                Your emergency request is confirmed
              </Text>
            </View>

            <View className="px-6 pb-6 pt-5">
              <View className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <Text className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Emergency case
                </Text>
                <Text className="mt-1 text-base font-black text-gray-900">
                  {reservedDialog?.emergencyId}
                </Text>
              </View>

              <View className="mt-3 flex-row items-center rounded-2xl border border-green-100 bg-green-50 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <Ionicons name="water" size={21} color="#16A34A" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-black text-green-900">
                    {reservedDialog?.unitsNeeded} unit(s) of {reservedDialog?.bloodType}
                  </Text>
                  <Text className="mt-1 text-xs font-medium text-green-700">
                    Reserved from the blood bank. No donor search was needed.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  const onDone = reservedDialog?.onDone;
                  setReservedDialog(null);
                  onDone?.();
                }}
                className="mt-5 rounded-2xl bg-gray-950 py-4"
              >
                <Text className="text-center text-sm font-black uppercase tracking-widest text-white">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          EMERGENCY REPORT MODAL
      ================================================== */}

      <Modal
        animationType="slide"
        transparent={
          true
        }
        visible={
          reportModalVisible
        }
        onRequestClose={() =>
          setReportModalVisible(
            false
          )
        }
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[85%] rounded-t-[40px] border-t border-gray-100 bg-white px-6 pb-10 pt-8">
            <View className="mb-6 h-1.5 w-12 self-center rounded-full bg-gray-200" />

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* HEADER */}

              <View className="mb-6 items-center">
                <Text className="text-center text-3xl font-black text-gray-900">
                  Report{" "}
                  {
                    selectedCategory
                  }
                </Text>

                <Text className="mt-2 px-4 text-center text-sm text-gray-400">
                  Broadcast this emergency to find donors immediately.
                </Text>
              </View>

              {/* FORM */}

              <View className="mb-8 gap-5">
                {/* LOCATION */}

                <View>
                  <Text className="mb-3 ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Hospital / Location
                  </Text>

                  <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#6B7280"
                      style={{
                        marginRight:
                          12,
                      }}
                    />

                    <TextInput
                      className="flex-1 text-base font-semibold text-gray-900"
                      placeholder="e.g. Civil Hospital Swat"
                      placeholderTextColor="#9CA3AF"
                      value={
                        reportLocation
                      }
                      onChangeText={
                        setReportLocation
                      }
                      editable={
                        !submitLoading
                      }
                    />
                  </View>
                </View>

                {/* PHONE */}

                <View>
                  <Text className="mb-3 ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Contact Phone Number
                  </Text>

                  <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color="#6B7280"
                      style={{
                        marginRight:
                          12,
                      }}
                    />

                    <TextInput
                      className="flex-1 text-base font-semibold text-gray-900"
                      placeholder="e.g. +923XXXXXXXXX"
                      placeholderTextColor="#9CA3AF"
                      value={
                        reportPhone
                      }
                      onChangeText={
                        setReportPhone
                      }
                      keyboardType="phone-pad"
                      editable={
                        !submitLoading
                      }
                    />
                  </View>
                </View>

                {/* PRIORITY */}

                <View>
                  <Text className="mb-3 ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Priority Level
                  </Text>

                  <View className="flex-row justify-between gap-2">
                    {PriorityLevels.map(
                      (level) => {
                        const active =
                          reportPriority ===
                          level.label;

                        return (
                          <TouchableOpacity
                            key={
                              level.label
                            }
                            activeOpacity={
                              0.8
                            }
                            disabled={
                              submitLoading
                            }
                            onPress={() =>
                              setReportPriority(
                                level.label
                              )
                            }
                            style={{
                              borderColor:
                                active
                                  ? level.color
                                  : "#E5E7EB",

                              backgroundColor:
                                active
                                  ? level.background
                                  : "#FFFFFF",
                            }}
                            className="flex-1 items-center rounded-2xl border py-3.5 shadow-sm"
                          >
                            <Text
                              style={{
                                color: active
                                  ? level.color
                                  : "#6B7280",
                              }}
                              className="text-xs font-black uppercase tracking-wider"
                            >
                              {level.label}
                            </Text>

                            <Text
                              style={{
                                color: active
                                  ? level.color
                                  : "#9CA3AF",
                              }}
                              className="mt-1 text-[10px] font-semibold"
                            >
                              {level.unitsNeeded} units
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                </View>

                {/* BLOOD TYPE */}

                <View>
                  <Text className="mb-3 ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Blood Type Needed
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      !submitLoading &&
                      setShowBloodTypePicker(
                        !showBloodTypePicker
                      )
                    }
                    activeOpacity={
                      0.7
                    }
                    className={`flex-row items-center border border-gray-200 bg-white px-4 py-4 shadow-sm ${
                      showBloodTypePicker
                        ? "rounded-t-2xl border-b-0"
                        : "rounded-2xl"
                    }`}
                  >
                    <Ionicons
                      name="water-outline"
                      size={20}
                      color="#6B7280"
                      style={{
                        marginRight:
                          12,
                      }}
                    />

                    <Text className="flex-1 text-base font-semibold text-gray-900">
                      {
                        reportBloodType
                      }
                    </Text>

                    <Ionicons
                      name={
                        showBloodTypePicker
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>

                  {showBloodTypePicker && (
                    <View className="rounded-b-2xl border border-t-0 border-gray-200 bg-white px-4 pb-4 pt-2 shadow-sm">
                      <View className="flex-row flex-wrap justify-between gap-y-3">
                        {BloodTypes.map(
                          (
                            type
                          ) => (
                            <TouchableOpacity
                              key={
                                type
                              }
                              onPress={() => {
                                setReportBloodType(
                                  type
                                );

                                setShowBloodTypePicker(
                                  false
                                );
                              }}
                              className={`h-12 w-[23%] items-center justify-center rounded-xl border ${
                                reportBloodType ===
                                type
                                  ? "border-red-600 bg-red-50"
                                  : "border-gray-100 bg-gray-50"
                              }`}
                            >
                              <Text
                                className={`text-sm font-bold ${
                                  reportBloodType ===
                                  type
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {
                                  type
                                }
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    </View>
                  )}
                </View>

                {/* NOTES */}

                <View>
                  <Text className="mb-3 ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Additional details / notes
                  </Text>

                  <View className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <TextInput
                      className="text-base font-semibold text-gray-900"
                      placeholder="e.g. Critical condition, multiple donors needed."
                      placeholderTextColor="#9CA3AF"
                      value={
                        reportNotes
                      }
                      onChangeText={
                        setReportNotes
                      }
                      multiline={
                        true
                      }
                      numberOfLines={
                        3
                      }
                      editable={
                        !submitLoading
                      }
                    />
                  </View>
                </View>
              </View>

              {/* ACTION BUTTONS */}

              <View className="gap-3">
                <TouchableOpacity
                  onPress={
                    handleSendEmergencyAlert
                  }
                  disabled={
                    submitLoading
                  }
                  activeOpacity={
                    0.9
                  }
                  className="overflow-hidden rounded-2xl bg-red-600 shadow-lg"
                >
                  <View className="items-center py-4">
                    {submitLoading ? (
                      <ActivityIndicator
                        color="white"
                      />
                    ) : (
                      <Text className="text-base font-black uppercase tracking-widest text-white">
                        Broadcast Emergency Alert 📢
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    setReportModalVisible(
                      false
                    )
                  }
                  disabled={
                    submitLoading
                  }
                  className="rounded-2xl border border-gray-200 bg-white py-4"
                >
                  <View className="items-center">
                    <Text className="text-base font-bold uppercase tracking-widest text-gray-800">
                      Cancel
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          RESPONDING DONORS MODAL
      ================================================== */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={respondersModalVisible}
        onRequestClose={() =>
          setRespondersModalVisible(false)
        }
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[80%] rounded-t-[36px] bg-white px-5 pb-8 pt-6">
            <View className="mb-5 h-1.5 w-12 self-center rounded-full bg-gray-200" />

            {/* Header */}
            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-black text-gray-900">
                  Responding Donors
                </Text>

                <Text className="mt-1 text-xs font-semibold text-gray-400">
                  Case: {selectedEmergencyId}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setRespondersModalVisible(false)
                }
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#111827"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
            >
              {selectedResponders.length === 0 ? (
                <View className="items-center py-12">
                  <Ionicons
                    name="people-outline"
                    size={60}
                    color="#D1D5DB"
                  />

                  <Text className="mt-4 text-base font-black text-gray-400">
                    No Responders Yet
                  </Text>
                </View>
              ) : (
                selectedResponders.map(
                  (donor, index) => (
                    <View
                      key={`${donor.donorUid}-${index}`}
                      className="mb-3 rounded-3xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <View className="flex-row items-center">
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100">
                          <Text className="text-lg font-black text-red-600">
                            {donor.donorName
                              ?.charAt(0)
                              ?.toUpperCase() || "D"}
                          </Text>
                        </View>

                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center">
                            <Text className="flex-1 text-sm font-black text-gray-900">
                              {donor.donorName || "Donor"}
                            </Text>

                            <View className="rounded-full bg-red-100 px-3 py-1">
                              <Text className="text-xs font-black text-red-600">
                                {donor.bloodType || "Unknown"}
                              </Text>
                            </View>
                          </View>

                          <View className="mt-2 self-start rounded-full bg-blue-50 px-3 py-1">
                            <Text className="text-[10px] font-black uppercase text-blue-700">
                              {donor.status || donor.response || "Accepted"}
                            </Text>
                          </View>

                          {/* Live journey line — only for donors who are
                              actively on the way or have arrived. */}
                          {(donor.status === "On The Way" ||
                            donor.status === "Arrived") && (
                            <View className="mt-2 flex-row items-center rounded-xl bg-blue-50 px-3 py-2">
                              <Ionicons
                                name={
                                  donor.status === "Arrived"
                                    ? "location"
                                    : "navigate"
                                }
                                size={14}
                                color="#2563EB"
                              />
                              <Text className="ml-2 text-xs font-bold text-blue-700">
                                {donor.status === "Arrived"
                                  ? `${donor.donorName || "This donor"} has arrived`
                                  : `${donor.donorName || "This donor"} is on the way`}
                              </Text>
                            </View>
                          )}

                          <View className="mt-2 flex-row items-center">
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color="#6B7280"
                            />

                            <Text
                              numberOfLines={1}
                              className="ml-1 flex-1 text-xs font-semibold text-gray-500"
                            >
                              {donor.donorLocation ||
                                "Location not available"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="mt-4 flex-row items-center justify-between border-t border-gray-200 pt-3">
                        <View className="mr-3 flex-1 flex-row items-center">
                          <Ionicons
                            name="call-outline"
                            size={16}
                            color="#6B7280"
                          />

                          <Text
                            numberOfLines={1}
                            className="ml-2 flex-1 text-xs font-bold text-gray-600"
                          >
                            {donor.donorPhone ||
                              "Phone not available"}
                          </Text>
                        </View>

                        {donor.donorPhone ? (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                              handleCall(
                                donor.donorPhone
                              )
                            }
                            className="flex-row items-center rounded-xl bg-green-600 px-4 py-2.5"
                          >
                            <Ionicons
                              name="call"
                              size={15}
                              color="white"
                            />

                            <Text className="ml-2 text-xs font-black text-white">
                              Call
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          NEARBY DONORS MODAL
      ================================================== */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={nearbyDonorsModalVisible}
        onRequestClose={() =>
          setNearbyDonorsModalVisible(false)
        }
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[82%] rounded-t-[36px] bg-white px-5 pb-8 pt-6">
            <View className="mb-5 h-1.5 w-12 self-center rounded-full bg-gray-200" />

            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-black text-gray-900">
                  Nearby Ready Donors
                </Text>

                <Text className="mt-1 text-xs font-semibold text-gray-400">
                  Case: {selectedNearbyEmergencyId}
                </Text>

                <Text className="mt-1 text-xs font-bold text-red-600">
                  Blood needed: {selectedNearbyBloodType || "ANY"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setNearbyDonorsModalVisible(false)
                }
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#111827"
                />
              </TouchableOpacity>
            </View>

            <View className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
              <View className="flex-row items-center">
                <Ionicons
                  name="navigate-circle-outline"
                  size={20}
                  color="#EA580C"
                />

                <Text className="ml-2 flex-1 text-xs font-bold text-orange-700">
                  Donors are sorted from nearest to farthest from this emergency.
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
            >
              {nearbyDonors.length === 0 ? (
                <View className="items-center py-12">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-orange-50">
                    <Ionicons
                      name="location-outline"
                      size={38}
                      color="#FB923C"
                    />
                  </View>

                  <Text className="mt-4 text-base font-black text-gray-500">
                    No Nearby Matching Donors
                  </Text>

                  <Text className="mt-2 px-7 text-center text-xs font-medium leading-5 text-gray-400">
                    No available donor with matching blood type and GPS location was found.
                  </Text>
                </View>
              ) : (
                nearbyDonors.map(
                  (donor, index) => (
                    <View
                      key={donor.id}
                      className="mb-3 rounded-3xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <View className="flex-row items-center">
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100">
                          <Text className="text-lg font-black text-red-600">
                            {donor.fullName
                              ?.charAt(0)
                              ?.toUpperCase() || "D"}
                          </Text>
                        </View>

                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center">
                            <Text className="flex-1 text-sm font-black text-gray-900">
                              {index + 1}. {donor.fullName || "Donor"}
                            </Text>

                            <View className="rounded-full bg-red-100 px-3 py-1">
                              <Text className="text-xs font-black text-red-600">
                                {donor.bloodType || "Unknown"}
                              </Text>
                            </View>
                          </View>

                          <View className="mt-2 flex-row items-center">
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color="#6B7280"
                            />

                            <Text
                              numberOfLines={1}
                              className="ml-1 flex-1 text-xs font-semibold text-gray-500"
                            >
                              {donor.location ||
                                "Location not available"}
                            </Text>
                          </View>

                          <View className="mt-2 self-start rounded-full bg-orange-100 px-3 py-1.5">
                            <Text className="text-[10px] font-black uppercase tracking-wider text-orange-700">
                              {donor.emergencyDistance} km away
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="mt-4 flex-row items-center justify-between border-t border-gray-200 pt-3">
                        <View className="flex-row items-center">
                          <View className="mr-2 h-2.5 w-2.5 rounded-full bg-green-500" />

                          <Text className="text-xs font-bold text-green-700">
                            Available Now
                          </Text>
                        </View>

                        {donor.phoneNumber ? (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                              handleCall(
                                donor.phoneNumber
                              )
                            }
                            className="flex-row items-center rounded-xl bg-green-600 px-4 py-2.5"
                          >
                            <Ionicons
                              name="call"
                              size={15}
                              color="white"
                            />

                            <Text className="ml-2 text-xs font-black text-white">
                              Call
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default Emergency
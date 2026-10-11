import BloodRequestCard from "@/src/components/bloodRequestCard";

import { Ionicons } from "@expo/vector-icons";

import {

  collection,

  getDocs,

  orderBy,

  query,

} from "@/src/lib/backendCompat";

import { apiRequest } from "@/src/lib/api";

import React, { useEffect, useState } from "react";

import {

  ActivityIndicator,

  Alert,

  Linking,

  Modal,

  ScrollView,

  StatusBar,

  Text,

  TextInput,

  TouchableOpacity,

  View,

} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../../../config/backendConfig";

interface BloodRequestResponder {

  id: string;

  bloodRequestId: string;

  donorId: string;

  donorName: string;

  donorPhone?: string;

  bloodType?: string;

  donorLocation?: string;

  status: string;

  createdAt?: any;

  updatedAt?: any;

}

const Requests = () => {

  const [requests, setRequests] = useState<any[]>([]);

  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [, setTimeTick] = useState(0);

  const [loading, setLoading] = useState(true);

  const [donateLoading, setDonateLoading] = useState(false);

  const [respondedRequestIds, setRespondedRequestIds] = useState<string[]>([]);

  const [responderLoading, setResponderLoading] = useState(false);

  const [responderActionLoading, setResponderActionLoading] = useState(false);

  const [bloodResponders, setBloodResponders] = useState<BloodRequestResponder[]>([]);

  const [inlineResponders, setInlineResponders] = useState<Record<string, BloodRequestResponder[]>>({});

  const [responderModal, setResponderModal] = useState<{ request: any; response: BloodRequestResponder } | null>(null);

  // ======================================================

  // DETAIL CARD MODAL

  // ======================================================

  const [selectedRequest, setSelectedRequest] =

    useState<any | null>(null);

  const [detailVisible, setDetailVisible] =

    useState(false);

  const loadRequestResponders = async (requestId: string) => {

    setResponderLoading(true);

    try {

      const data = await apiRequest<any[]>(

        `/api/blood-requests/${requestId}/responses`,

      );

      setBloodResponders(

        (data || []).map((response: any) => ({

          id: String(response.id ?? response.Id),

          bloodRequestId: String(

            response.bloodRequestId ??

              response.BloodRequestId ??

              requestId,

          ),

          donorId: String(

            response.donorId ??

              response.DonorId ??

              "",

          ),

          donorName:

            response.donorName ??

            response.DonorName ??

            "Donor",

          donorPhone:

            response.donorPhone ??

            response.DonorPhone,

          bloodType:

            response.bloodType ??

            response.BloodType,

          status:

            response.status ??

            response.Status ??

            "Pending",

          createdAt:

            response.createdAt ??

            response.CreatedAt,

          updatedAt:

            response.updatedAt ??

            response.UpdatedAt,

        })),

      );

    } catch (error: any) {

      console.error("Load responders failed:", error);

      setBloodResponders([]);

    } finally {

      setResponderLoading(false);

    }

  };

  const loadInlineResponders = async (requestList: any[]) => {

    const ownRequests = requestList.filter((req) => req.isOwnRequest && req.id);

    if (ownRequests.length === 0) {

      setInlineResponders({});

      return;

    }

    const entries = await Promise.all(

      ownRequests.map(async (req) => {

        try {

          const data = await apiRequest<any[]>(

            `/api/blood-requests/${req.id}/responses`,

          );

          const responses: BloodRequestResponder[] = (data || []).map(

            (response: any) => ({

              id: String(response.id ?? response.Id),

              bloodRequestId: String(

                response.bloodRequestId ??

                  response.BloodRequestId ??

                  req.id,

              ),

              donorId: String(

                response.donorId ??

                  response.DonorId ??

                  "",

              ),

              donorName:

                response.donorName ??

                response.DonorName ??

                "Donor",

              donorPhone:

                response.donorPhone ??

                response.DonorPhone,

              bloodType:

                response.bloodType ??

                response.BloodType,

              donorLocation:

                response.donorLocation ??

                response.DonorLocation ??

                response.location ??

                response.Location,

              status:

                response.status ??

                response.Status ??

                "Pending",

              createdAt:

                response.createdAt ??

                response.CreatedAt,

              updatedAt:

                response.updatedAt ??

                response.UpdatedAt,

            }),

          );

          return [String(req.id), responses] as const;

        } catch {

          return [String(req.id), []] as const;

        }

      }),

    );

    setInlineResponders(Object.fromEntries(entries));

  };

  const openRequestDetail = async (req: any) => {

    setSelectedRequest(req);

    setBloodResponders([]);

    setDetailVisible(true);

    if (req.isOwnRequest && req.id) {

      await loadRequestResponders(String(req.id));

    }

  };

  const closeRequestDetail = () => {

    if (donateLoading || responderActionLoading) return;

    setDetailVisible(false);

    setSelectedRequest(null);

    setBloodResponders([]);

  };

  // ======================================================

  // LOAD REQUESTS

  // ======================================================

  useEffect(() => {

    fetchRequests();

    // Sync request status changes made from another phone.

    const syncInterval = setInterval(() => {

      fetchRequests();

    }, 2000);

    return () => clearInterval(syncInterval);

  }, []);

  // ======================================================

  // LIVE "TIME AGO" UPDATE

  // ======================================================

  useEffect(() => {

    const timeInterval = setInterval(() => {

      // Force a lightweight re-render so getTimeAgo(createdAt)

      // keeps changing: 1 min ago -> 2 mins ago -> 1 hour ago...

      setTimeTick((value) => value + 1);

    }, 1000);

    return () => clearInterval(timeInterval);

  }, []);

  // ======================================================

  // REMOVE EXPIRED REQUESTS FROM UI

  // ======================================================

  useEffect(() => {

    const removeExpiredRequests = () => {

      const now = Date.now();

      const isNotExpired = (request: any) => {

        if (!request?.expireAt) return true;

        const expireDate = request.expireAt?.toDate

          ? request.expireAt.toDate()

          : new Date(request.expireAt);

        if (Number.isNaN(expireDate.getTime())) {

          return true;

        }

        return expireDate.getTime() > now;

      };

      setRequests((current) =>

        current.filter(isNotExpired),

      );

      setFilteredRequests((current) =>

        current.filter(isNotExpired),

      );

      setSelectedRequest((current: any) => {

        if (!current || isNotExpired(current)) {

          return current;

        }

        setDetailVisible(false);

        return null;

      });

    };

    removeExpiredRequests();

    const expiryInterval = setInterval(

      removeExpiredRequests,

      10000,

    );

    return () =>

      clearInterval(expiryInterval);

  }, []);

  // ======================================================

  // FETCH BLOOD REQUESTS

  // ======================================================

  const fetchRequests = async () => {

    try {

      const currentUid = auth.currentUser?.uid;

      // Load own requests separately so Matched requests remain visible,

      // and load community Pending requests for donation.

      const [myData, pendingData, respondedIds] = await Promise.all([

        apiRequest<any[]>("/api/blood-requests/my").catch(() => []),

        apiRequest<any[]>("/api/blood-requests/pending").catch(() => []),

          apiRequest<string[]>("/api/blood-requests/my-responded-ids")

            .catch((error) => {

              console.warn("Could not refresh responded request IDs:", error);

              return null;

            }),

        ]);

        if (Array.isArray(respondedIds)) {

          setRespondedRequestIds(respondedIds.map(String));

        }

      const merged = [...(myData || []), ...(pendingData || [])];

      const unique = new Map<string, any>();

      merged.forEach((raw: any) => {

        const id = String(raw.id ?? raw.Id ?? "");

        if (!id) return;

        const reporterUid =

          raw.reporterUid ??

          raw.ReporterUid;

        const status = String(

          raw.status ??

          raw.Status ??

          "Pending",

        ).toLowerCase();

        // Completed/cancelled/rejected requests disappear automatically.

        if (

          status === "completed" ||

          status === "cancelled" ||

          status === "canceled" ||

          status === "rejected"

        ) {

          return;

        }

        const isOwnRequest =

          !!currentUid &&

          !!reporterUid &&

          String(reporterUid).toLowerCase() ===

            String(currentUid).toLowerCase();

        // Other users should only appear while still Pending.

        if (!isOwnRequest && status !== "pending") {

          return;

        }

        unique.set(id, {

          ...raw,

          id,

          reporterUid,

          isOwnRequest,

        });

      });

      const requestList = Array.from(unique.values()).sort(

        (a: any, b: any) =>

          new Date(b.createdAt ?? b.CreatedAt ?? 0).getTime() -

          new Date(a.createdAt ?? a.CreatedAt ?? 0).getTime(),

      );

      setRequests(requestList);

      // Also refresh donor responses so requester sees I Can Donate

      // responses directly on the request card without manual refresh.

      await loadInlineResponders(requestList);

      if (searchQuery.trim()) {

        const search = searchQuery.toLowerCase();

        setFilteredRequests(

          requestList.filter((req: any) =>

            [

              req.patientName,

              req.reporterName,

              req.bloodType,

              req.location,

              req.hospitalName,

              req.contactPhone,

            ]

              .filter(Boolean)

              .some((value) =>

                String(value)

                  .toLowerCase()

                  .includes(search),

              ),

          ),

        );

      } else {

        setFilteredRequests(requestList);

      }

    } catch (error) {

      console.error(

        "Error fetching requests:",

        error,

      );

    } finally {

      setLoading(false);

    }

  };

  // ======================================================

  // SEARCH

  // ======================================================

  const handleSearch = (

    text: string,

  ) => {

    setSearchQuery(text);

    if (text.trim() === "") {

      setFilteredRequests(

        requests,

      );

      return;

    }

    const search =

      text.toLowerCase();

    const filtered =

      requests.filter((req) => {

        return (

          req.patientName

            ?.toLowerCase()

            .includes(search) ||

          req.bloodType

            ?.toLowerCase()

            .includes(search) ||

          req.hospitalName

            ?.toLowerCase()

            .includes(search) ||

          req.location

            ?.toLowerCase()

            .includes(search) ||

          req.contactPhone

            ?.toLowerCase()

            .includes(search)

        );

      });

    setFilteredRequests(

      filtered,

    );

  };

  // ======================================================

  // CALL REQUESTER

  // ======================================================

  const handleCall = (

    phoneNumber?: string,

  ) => {

    if (!phoneNumber) {

      Alert.alert(

        "Contact Unavailable",

        "Contact number is not available.",

      );

      return;

    }

    const sanitizedNumber =

      phoneNumber.replace(

        /[^\d+]/g,

        "",

      );

    const url =

      `tel:${sanitizedNumber}`;

    Linking.openURL(url).catch(

      (error) => {

        console.error(

          "Error opening dialer:",

          error,

        );

        Alert.alert(

          "Call Failed",

          "Phone calls are not supported on this device.",

        );

      },

    );

  };

  // ======================================================

  // I CAN DONATE

  // ASP.NET CORE:

  // POST /api/blood-requests/{id}/respond

  // ======================================================

  const handleOfferToDonate =

    async () => {

      if (

        !selectedRequest ||

        donateLoading

      ) {

        return;

      }

      if (!selectedRequest.id) {

        Alert.alert(

          "Error",

          "Blood request reference was not found.",

        );

        return;

      }

      const currentUser =

        auth.currentUser;

      if (!currentUser) {

        Alert.alert(

          "Login Required",

          "Please login again before responding.",

        );

        return;

      }

      // Extra frontend protection.

      // Backend also validates this.

      if (

        selectedRequest.reporterUid &&

        selectedRequest.reporterUid ===

          currentUser.uid

      ) {

        Alert.alert(

          "Not Allowed",

          "You cannot respond to your own blood request.",

        );

        return;

      }

      if (respondedRequestIds.includes(String(selectedRequest.id))) {

        Alert.alert("Already Responded", "You have already offered to donate for this request.");

        return;

      }



      setDonateLoading(true);

      try {

        await apiRequest(

          `/api/blood-requests/${selectedRequest.id}/respond`,

          {

            method: "POST",

          },

        );

        // Backend now handles:

        // 1. BloodRequestResponse SQL insert

        // 2. Duplicate response protection

        // 3. Blood type validation

        // 4. Private notification insert

        // 5. SignalR notification to requester

        // 6. Expo push notification

          setRespondedRequestIds((current) =>

            Array.from(new Set([...current, String(selectedRequest.id)])),

          );



        Alert.alert(

          "Response Sent ❤️",

          "The requester has been notified that you can donate.",

          [

            {

              text: "OK",

              onPress: () => {

                setDetailVisible(

                  false,

                );

                setSelectedRequest(

                  null,

                );

              },

            },

          ],

        );

      } catch (error: any) {

        console.error(

          "I Can Donate error:",

          error,

        );

        const message =

          error?.message ||

          "Could not send your donation response. Please try again.";

        Alert.alert(

          "Could Not Send Response",

          message,

        );

      } finally {

        setDonateLoading(false);

      }

    };

  // ======================================================

  // MANAGE DONOR RESPONSES FROM MY REQUEST

  // ======================================================

  const runResponderAction = async (

    response: BloodRequestResponder,

    action: "confirm" | "reject" | "complete",

  ) => {

    if (!selectedRequest?.id || responderActionLoading) {

      return;

    }

    setResponderActionLoading(true);

    try {

      await apiRequest(

        `/api/blood-requests/${selectedRequest.id}/responses/${response.id}/${action}`,

        { method: "PATCH" },

      );

      if (action === "complete") {

        // Remove the completed request immediately from the UI.

        const completedId = String(selectedRequest.id);

        setRequests((current) =>

          current.filter(

            (item) => String(item.id) !== completedId,

          ),

        );

        setFilteredRequests((current) =>

          current.filter(

            (item) => String(item.id) !== completedId,

          ),

        );

        setDetailVisible(false);

        setSelectedRequest(null);

        setBloodResponders([]);

        Alert.alert(

          "Donation Completed ❤️",

          "The donation has been completed. The blood request has been removed from the list.",

        );

        // Sync again with SQL/backend.

        await fetchRequests();

        return;

      }

      if (action === "reject") {

        // Rejected response disappears immediately from the requester UI.

        setBloodResponders((current) =>

          current.filter(

            (item) => String(item.id) !== String(response.id),

          ),

        );

      } else {

        await loadRequestResponders(

          String(selectedRequest.id),

        );

      }

      // Confirm changes request status to Matched.

      setSelectedRequest((current: any) =>

        current

          ? {

              ...current,

              status:

                action === "confirm"

                  ? "Matched"

                  : current.status,

            }

          : current,

      );

      Alert.alert(

        action === "confirm"

          ? "Donor Confirmed"

          : "Response Rejected",

        action === "confirm"

          ? `${response.donorName} has been confirmed as a donor.`

          : `${response.donorName}'s donation response has been rejected.`,

      );

      await fetchRequests();

    } catch (error: any) {

      console.error(

        `Responder ${action} failed:`,

        error,

      );

      Alert.alert(

        "Action Failed",

        error?.message ||

          "Unable to update the donor response. Please try again.",

      );

    } finally {

      setResponderActionLoading(false);

    }

  };

  const runInlineResponderAction = async (

    request: any,

    response: BloodRequestResponder,

    action: "confirm" | "reject",

  ) => {

    if (responderActionLoading) return;

    setResponderActionLoading(true);

    try {

      await apiRequest(

        `/api/blood-requests/${request.id}/responses/${response.id}/${action}`,

        { method: "PATCH" },

      );

      // New flow: CONFIRM means donation is completed immediately.

      // This removes the separate Complete step.

      if (action === "confirm") {

        await apiRequest(

          `/api/blood-requests/${request.id}/responses/${response.id}/complete`,

          { method: "PATCH" },

        );

        setResponderModal(null);

        // Remove completed request instantly from requester UI.

        setRequests((current) =>

          current.filter(

            (item) => String(item.id) !== String(request.id),

          ),

        );

        setFilteredRequests((current) =>

          current.filter(

            (item) => String(item.id) !== String(request.id),

          ),

        );

        setInlineResponders((current) => {

          const next = { ...current };

          delete next[String(request.id)];

          return next;

        });

        setResponderModal(null);

        Alert.alert(

          "Donation Completed",

          `${response.donorName} has been confirmed. The completed blood request has been removed from the list.`,

        );

        await fetchRequests();

        return;

      }

      if (action === "reject") {

        setInlineResponders((current) => ({

          ...current,

          [String(request.id)]: (current[String(request.id)] || []).filter(

            (item) => String(item.id) !== String(response.id),

          ),

        }));

      } else {

        // Confirmation changes the request to Matched and the response to Confirmed.

        setInlineResponders((current) => ({

          ...current,

          [String(request.id)]: (current[String(request.id)] || []).map(

            (item) =>

              String(item.id) === String(response.id)

                ? { ...item, status: "Confirmed" }

                : item,

          ),

        }));

      }

      // Confirm branch already returns above, so reaching here means

      // the action is definitely "reject".

      Alert.alert(

        "Response Rejected",

        `${response.donorName}'s donation response has been rejected.`,

      );

      await fetchRequests();

    } catch (error: any) {

      Alert.alert(

        "Action Failed",

        error?.message || "Unable to update the donor response. Please try again.",

      );

    } finally {

      setResponderActionLoading(false);

    }

  };

  const confirmInlineResponder = (

    request: any,

    response: BloodRequestResponder,

  ) => {

    Alert.alert(

      "Confirm Donation",

      `Confirm ${response.donorName} and mark this blood request as completed?`,

      [

        { text: "Cancel", style: "cancel" },

        {

          text: "Confirm",

          onPress: () =>

            runInlineResponderAction(request, response, "confirm"),

        },

      ],

    );

  };

  const rejectInlineResponder = (

    request: any,

    response: BloodRequestResponder,

  ) => {

    Alert.alert(

      "Reject Response",

      `Are you sure you want to reject ${response.donorName}'s donation response?`,

      [

        { text: "Cancel", style: "cancel" },

        {

          text: "Reject",

          style: "destructive",

          onPress: () =>

            runInlineResponderAction(request, response, "reject"),

        },

      ],

    );

  };

  const confirmResponder = (

    response: BloodRequestResponder,

  ) => {

    Alert.alert(

      "Confirm Donor",

      `Confirm ${response.donorName} as a donor for this blood request?`,

      [

        {

          text: "Cancel",

          style: "cancel",

        },

        {

          text: "Confirm",

          onPress: () =>

            runResponderAction(

              response,

              "confirm",

            ),

        },

      ],

    );

  };

  const rejectResponder = (

    response: BloodRequestResponder,

  ) => {

    Alert.alert(

      "Reject Response",

      `Are you sure you want to reject ${response.donorName}'s donation response?`,

      [

        {

          text: "Cancel",

          style: "cancel",

        },

        {

          text: "Reject",

          style: "destructive",

          onPress: () =>

            runResponderAction(

              response,

              "reject",

            ),

        },

      ],

    );

  };

  const completeDonation = (

    response: BloodRequestResponder,

  ) => {

    Alert.alert(

      "Complete Donation",

      "Mark this donation as completed? The blood request will be removed from the list.",

      [

        {

          text: "Cancel",

          style: "cancel",

        },

        {

          text: "Complete",

          onPress: () =>

            runResponderAction(

              response,

              "complete",

            ),

        },

      ],

    );

  };

  // ======================================================

  // TIME AGO

  // ======================================================

  const getTimeAgo = (

    timestamp: any,

  ) => {

    if (!timestamp) {

      return "0 secs ago";

    }

    // Backend sends UTC ISO timestamps. If SQL/ASP.NET returns an ISO

    // string without timezone information, explicitly treat it as UTC.

    let date: Date;

    if (timestamp?.toDate) {

      date = timestamp.toDate();

    } else if (typeof timestamp === "string") {

      const value = timestamp.trim();

      const hasTimezone =

        /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

      date = new Date(

        hasTimezone ? value : `${value}Z`,

      );

    } else {

      date = new Date(timestamp);

    }

    if (Number.isNaN(date.getTime())) {

      return "0 secs ago";

    }

    const seconds = Math.max(

      0,

      Math.floor(

        (Date.now() - date.getTime()) / 1000,

      ),

    );

    if (seconds < 60) {

      return `${seconds} sec${

        seconds === 1 ? "" : "s"

      } ago`;

    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {

      return `${minutes} min${

        minutes === 1 ? "" : "s"

      } ago`;

    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {

      return `${hours} hour${

        hours === 1 ? "" : "s"

      } ago`;

    }

    const days = Math.floor(hours / 24);

    return `${days} day${

      days === 1 ? "" : "s"

    } ago`;

  };

  // ======================================================

  // GROUP REQUESTS

  // ======================================================

  const myRequests = filteredRequests.filter(

    (req) => req.isOwnRequest,

  );

  const donorNeededRequests = filteredRequests.filter(

    (req) => !req.isOwnRequest,

  );

  // ======================================================

  // UI

  // ======================================================

  return (

    <SafeAreaView

      className="flex-1 bg-white"

      edges={["bottom"]}

    >

      <StatusBar

        barStyle="light-content"

        backgroundColor="transparent"

        translucent

      />

      {loading ? (

        <View className="flex-1 items-center justify-center">

          <ActivityIndicator

            size="large"

            color="#DC2626"

          />

          <Text className="mt-4 font-medium text-gray-400">

            Loading Requests...

          </Text>

        </View>

      ) : (

        <ScrollView

          showsVerticalScrollIndicator={

            false

          }

          contentContainerStyle={{

            paddingBottom: 60,

          }}

          className="flex-1"

        >

          {/* ==========================================

              SEARCH BAR

          ========================================== */}

          <View className="border-b border-gray-50 px-4 py-4">

            <View className="flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4 shadow-sm">

              <Ionicons

                name="search-outline"

                size={20}

                color="#9CA3AF"

              />

              <TextInput

                className="ml-3 flex-1 text-base font-semibold text-gray-900"

                placeholder="Search by name, phone, blood, location..."

                placeholderTextColor="#9CA3AF"

                value={

                  searchQuery

                }

                onChangeText={

                  handleSearch

                }

              />

              {searchQuery !==

                "" && (

                <Ionicons

                  name="close-circle"

                  size={20}

                  color="#9CA3AF"

                  onPress={() =>

                    handleSearch(

                      "",

                    )

                  }

                />

              )}

            </View>

          </View>

          {/* ==========================================

              REQUEST GROUPS

          ========================================== */}

          {filteredRequests.length > 0 ? (

            <>

              {/* MY REQUESTS */}

              {myRequests.length > 0 && (

                <View className="mb-6">

                  <View className="mx-4 mb-3 mt-2 flex-row items-center">

                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-green-50">

                      <Ionicons

                        name="person-circle-outline"

                        size={21}

                        color="#16A34A"

                      />

                    </View>

                    <View className="ml-3 flex-1">

                      <Text className="text-[15px] font-black text-gray-900">

                        My Requests

                      </Text>

                      <Text className="text-[10px] font-semibold text-gray-400">

                        Requests posted by you

                      </Text>

                    </View>

                    <View className="rounded-full bg-green-50 px-3 py-1.5">

                      <Text className="text-[11px] font-black text-green-700">

                        {myRequests.length}

                      </Text>

                    </View>

                  </View>

                  {myRequests.map((req) => (

                    <View key={req.id} className="mx-4 mb-4 overflow-hidden rounded-[24px] border border-gray-100 bg-white">

                      <View className="px-3 pt-3">

                        <View className="mb-1.5 flex-row items-center px-1">

                        <View className="flex-row items-center rounded-full border border-green-200 bg-green-50 px-3 py-1.5">

                          <Ionicons

                            name="person-circle-outline"

                            size={14}

                            color="#16A34A"

                          />

                          <Text className="ml-1.5 text-[10px] font-black uppercase tracking-wider text-green-700">

                            My Request

                          </Text>

                        </View>

                      </View>

                      <BloodRequestCard

                        patientName={req.patientName}

                        bloodType={req.bloodType}

                        location={`${req.hospitalName || ""}${

                          req.location

                            ? `, ${req.location.split("|")[0]}`

                            : ""

                        }`}

                        timeAgo={getTimeAgo(req.createdAt)}

                        units={req.unitsNeeded}

                        isUrgent={

                          req.urgency === "Urgent" ||

                          req.urgency === "Critical"

                        }

                        avatarUrl={req.avatarUrl}

                        gender={req.gender}

                        reporterName={req.reporterName}

                        onCallPress={() =>

                          handleCall(req.contactPhone)

                        }

                        onPress={() =>

                          openRequestDetail(req)

                        }

                      />

                      </View>

                      {(inlineResponders[String(req.id)] || [])

                        .filter(

                          (response) =>

                            String(response.status || "Pending").toLowerCase() ===

                            "pending",

                        )

                        .map((response) => (
                          <TouchableOpacity
                            key={response.id}
                            activeOpacity={0.85}
                            onPress={() => setResponderModal({ request: req, response })}
                            className="mx-3 mb-3 flex-row items-center rounded-2xl border border-green-100 bg-green-50 px-4 py-3"
                          >
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                              <Ionicons name="people" size={19} color="#16A34A" />
                            </View>
                            <View className="ml-3 flex-1">
                              <Text className="text-[13px] font-black text-gray-900">Responder</Text>
                              <Text className="mt-1 text-[11px] font-semibold text-green-700">
                                {response.donorName} • {response.bloodType || "Donor"}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#16A34A" />
                          </TouchableOpacity>
                        ))}

                    </View>

                  ))}

                </View>

              )}

              {/* DONOR NEEDED */}

              {donorNeededRequests.length > 0 && (

                <View className="mb-4">

                  <View className="mx-4 mb-3 flex-row items-center">

                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-50">

                      <Ionicons

                        name="people-outline"

                        size={20}

                        color="#2563EB"

                      />

                    </View>

                    <View className="ml-3 flex-1">

                      <Text className="text-[15px] font-black text-gray-900">

                        Donor Needed

                      </Text>

                      <Text className="text-[10px] font-semibold text-gray-400">

                        Requests from other users

                      </Text>

                    </View>

                    <View className="rounded-full bg-blue-50 px-3 py-1.5">

                      <Text className="text-[11px] font-black text-blue-600">

                        {donorNeededRequests.length}

                      </Text>

                    </View>

                  </View>

                  {donorNeededRequests.map((req) => (

                    <View

                      key={req.id}

                      className="mx-4 mb-4 overflow-hidden rounded-[24px] border border-gray-100 bg-white"

                    >

                      <View className="px-3 pt-3">

                        <BloodRequestCard

                          patientName={req.patientName}

                          bloodType={req.bloodType}

                          location={`${req.hospitalName || ""}${

                            req.location

                              ? `, ${req.location.split("|")[0]}`

                              : ""

                          }`}

                          timeAgo={getTimeAgo(req.createdAt)}

                          units={req.unitsNeeded}

                          isUrgent={

                            req.urgency === "Urgent" ||

                            req.urgency === "Critical"

                          }

                          avatarUrl={req.avatarUrl}

                          gender={req.gender}

                          reporterName={req.reporterName}

                          onCallPress={() =>

                            handleCall(req.contactPhone)

                          }

                          onPress={() =>

                            openRequestDetail(req)

                          }

                        />

                      </View>

                      <View className="mx-4 h-px bg-gray-100" />

                      {respondedRequestIds.includes(String(req.id)) ? (

                        <View className="m-3 mt-2 flex-row items-center justify-center rounded-2xl bg-green-50 py-3.5">

                          <Ionicons name="checkmark-circle" size={17} color="#16A34A" />

                          <Text className="ml-2 text-[11px] font-black uppercase text-green-700">

                            Already Responded

                          </Text>

                        </View>

                      ) : (

                      <TouchableOpacity

                        activeOpacity={0.88}

                        onPress={() => {

                          setSelectedRequest(req);

                          setBloodResponders([]);

                          setDetailVisible(true);

                        }}

                        className="m-3 mt-2 flex-row items-center justify-center rounded-2xl bg-red-600 py-3.5"

                      >

                        <Ionicons

                          name="heart"

                          size={17}

                          color="white"

                        />

                        <Text className="ml-2 text-[11px] font-black uppercase tracking-wider text-white">

                          I Can Donate

                        </Text>

                      </TouchableOpacity>

                      )}

                    </View>

                  ))}

                </View>

              )}

            </>

          ) : (

            <View className="flex-1 items-center justify-center py-20">

              <Ionicons

                name="flask-outline"

                size={80}

                color="#F3F4F6"

              />

              <Text className="mt-4 text-lg font-bold text-gray-400">

                No requests found

              </Text>

              <Text className="text-sm text-gray-300">

                Try searching with different criteria

              </Text>

            </View>

          )}

        </ScrollView>

      )}

      {/* ================================================

          REQUEST DETAIL MODAL

      ================================================ */}

              {/* RESPONDER DETAILS POPUP */}
        <Modal
          visible={responderModal !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => { if (!responderActionLoading) setResponderModal(null); }}
        >
          <View className="flex-1 items-center justify-center bg-black/60 px-5">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => { if (!responderActionLoading) setResponderModal(null); }}
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
            />
            {responderModal && (
              <View className="w-full rounded-[26px] bg-white px-5 pb-6 pt-5" style={{ maxWidth: 420 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-black text-gray-900">Responder Details</Text>
                  <TouchableOpacity
                    disabled={responderActionLoading}
                    onPress={() => setResponderModal(null)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                  >
                    <Ionicons name="close" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
                <View className="my-5 h-px bg-gray-100" />
                <View className="mb-5 flex-row items-center">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-green-50">
                    <Ionicons name="person" size={26} color="#16A34A" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-lg font-black text-gray-900">{responderModal.response.donorName}</Text>
                    <Text className="mt-1 text-xs font-bold text-red-600">
                      Blood Group: {responderModal.response.bloodType || "N/A"}
                    </Text>
                  </View>
                </View>
                <View className="mb-4 flex-row items-center">
                  <Ionicons name="location-outline" size={19} color="#64748B" />
                  <Text className="ml-3 flex-1 text-sm font-semibold text-gray-700">
                    {responderModal.response.donorLocation || "Location not available"}
                  </Text>
                </View>
                <View className="mb-5 flex-row items-center">
                  <Ionicons name="call-outline" size={19} color="#64748B" />
                  <Text className="ml-3 flex-1 text-sm font-semibold text-gray-700">
                    {responderModal.response.donorPhone || "Phone not available"}
                  </Text>
                  {responderModal.response.donorPhone ? (
                    <TouchableOpacity
                      onPress={() => handleCall(responderModal.response.donorPhone)}
                      className="h-10 w-10 items-center justify-center rounded-full bg-green-50"
                    >
                      <Ionicons name="call" size={18} color="#16A34A" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View className="mb-5 h-px bg-gray-100" />
                <View className="flex-row">
                  <TouchableOpacity
                    disabled={responderActionLoading}
                    onPress={() => confirmInlineResponder(responderModal.request, responderModal.response)}
                    className="flex-1 items-center rounded-xl bg-green-600 py-3.5"
                  >
                    {responderActionLoading ? <ActivityIndicator color="white" /> :
                      <Text className="text-sm font-black text-white">CONFIRM</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>

<Modal

        visible={detailVisible}

        transparent

        animationType="slide"

        onRequestClose={

          closeRequestDetail

        }

      >

        <View className="flex-1 justify-end bg-black/50">

          <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">

            {/* Drag Handle */}

            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-gray-200" />

            {selectedRequest && (

              <ScrollView

                showsVerticalScrollIndicator={

                  false

                }

              >

                {/* ==================================

                    HEADER

                ================================== */}

                <View className="flex-row items-center justify-between">

                  <Text className="text-xl font-black text-gray-900">

                    Request Details

                  </Text>

                  <TouchableOpacity

                    disabled={

                      donateLoading

                    }

                    onPress={

                      closeRequestDetail

                    }

                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"

                  >

                    <Ionicons

                      name="close"

                      size={18}

                      color="#111827"

                    />

                  </TouchableOpacity>

                </View>

                {/* ==================================

                    PATIENT + BLOOD TYPE

                ================================== */}

                <View className="mt-5 flex-row items-center">

                  <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-600">

                    <Text className="text-lg font-black text-white">

                      {

                        selectedRequest.bloodType

                      }

                    </Text>

                  </View>

                  <View className="ml-4 flex-1">

                    <Text className="text-lg font-black text-gray-900">

                      {

                        selectedRequest.patientName

                      }

                    </Text>

                    <View className="mt-1.5 flex-row items-center">

                      <View

                        className={`rounded-full px-2.5 py-1 ${

                          selectedRequest.urgency ===

                            "Urgent" ||

                          selectedRequest.urgency ===

                            "Critical"

                            ? "bg-red-50"

                            : "bg-blue-50"

                        }`}

                      >

                        <Text

                          className={`text-[10px] font-black uppercase tracking-wider ${

                            selectedRequest.urgency ===

                              "Urgent" ||

                            selectedRequest.urgency ===

                              "Critical"

                              ? "text-red-600"

                              : "text-blue-500"

                          }`}

                        >

                          {selectedRequest.urgency ||

                            "Normal"}

                        </Text>

                      </View>

                    </View>

                  </View>

                </View>

                {/* ==================================

                    DETAILS

                ================================== */}

                <View className="mt-6 gap-4">

                  <DetailRow

                    icon="location-outline"

                    label="Location"

                    value={`${

                      selectedRequest.hospitalName ||

                      ""

                    }${

                      selectedRequest.location

                        ? `, ${

                            selectedRequest.location.split(

                              "|",

                            )[0]

                          }`

                        : ""

                    }`}

                  />

                  <DetailRow

                    icon="water-outline"

                    label="Units Needed"

                    value={

                      selectedRequest.unitsNeeded

                        ? `${

                            selectedRequest.unitsNeeded

                          } unit${

                            Number(

                              selectedRequest.unitsNeeded,

                            ) >

                            1

                              ? "s"

                              : ""

                          }`

                        : "1 unit"

                    }

                  />

                  <DetailRow

                    icon="call-outline"

                    label="Contact Phone"

                    value={

                      selectedRequest.contactPhone ||

                      "Not provided"

                    }

                  />

                  <DetailRow

                    icon="time-outline"

                    label="Posted"

                    value={getTimeAgo(

                      selectedRequest.createdAt,

                    )}

                  />

                  {selectedRequest.additionalNotes ? (

                    <DetailRow

                      icon="document-text-outline"

                      label="Additional Notes"

                      value={

                        selectedRequest.additionalNotes

                      }

                    />

                  ) : null}

                </View>

                {/* ==================================

                    ACTION BUTTONS

                ================================== */}

                <View className="mt-7">

                  {selectedRequest.isOwnRequest ? (

                    <View>

                      <View className="mb-3 flex-row items-center justify-between">

                        <View className="flex-row items-center">

                          <View className="h-9 w-9 items-center justify-center rounded-xl bg-green-50">

                            <Ionicons

                              name="people-outline"

                              size={19}

                              color="#16A34A"

                            />

                          </View>

                          <View className="ml-2.5">

                            <Text className="text-[14px] font-black text-gray-900">

                              Donor Responses

                            </Text>

                            <Text className="text-[10px] font-semibold text-gray-400">

                              Confirm donor from this request

                            </Text>

                          </View>

                        </View>

                        <View className="rounded-full bg-green-50 px-3 py-1.5">

                          <Text className="text-[11px] font-black text-green-700">

                            {bloodResponders.length}

                          </Text>

                        </View>

                      </View>

                      {responderLoading ? (

                        <View className="items-center rounded-2xl border border-gray-100 bg-[#F8F9FB] py-8">

                          <ActivityIndicator

                            color="#DC2626"

                            size="small"

                          />

                          <Text className="mt-2 text-[11px] font-semibold text-gray-400">

                            Loading donor responses...

                          </Text>

                        </View>

                      ) : bloodResponders.length === 0 ? (

                        <View className="items-center rounded-2xl border border-dashed border-gray-200 bg-[#F8F9FB] px-4 py-7">

                          <Ionicons

                            name="heart-outline"

                            size={28}

                            color="#9CA3AF"

                          />

                          <Text className="mt-2 text-[12px] font-bold text-gray-500">

                            No donor response yet

                          </Text>

                          <Text className="mt-1 text-center text-[10px] font-medium text-gray-400">

                            Jab koi I Can Donate karega to uski detail yahan show hogi.

                          </Text>

                        </View>

                      ) : (

                        bloodResponders.map((response) => {

                          const status = String(

                            response.status || "Pending",

                          ).toLowerCase();

                          return (

                            <View

                              key={response.id}

                              className="mb-3 rounded-[20px] border border-gray-100 bg-[#F8F9FB] p-4"

                            >

                              <View className="flex-row items-center">

                                <View className="h-11 w-11 items-center justify-center rounded-full bg-red-50">

                                  <Ionicons

                                    name="person"

                                    size={21}

                                    color="#DC2626"

                                  />

                                </View>

                                <View className="ml-3 flex-1">

                                  <Text className="text-[15px] font-black text-gray-900">

                                    {response.donorName}

                                  </Text>

                                  <Text

                                    className={`mt-0.5 text-[10px] font-black uppercase ${

                                      status === "confirmed" ||

                                      status === "completed"

                                        ? "text-green-600"

                                        : status === "rejected"

                                          ? "text-gray-500"

                                          : "text-orange-500"

                                    }`}

                                  >

                                    {response.status}

                                  </Text>

                                </View>

                                <View className="rounded-xl bg-red-50 px-3 py-2">

                                  <Text className="text-[16px] font-black text-red-600">

                                    {response.bloodType || "—"}

                                  </Text>

                                </View>

                              </View>

                              <TouchableOpacity

                                disabled={!response.donorPhone}

                                onPress={() =>

                                  handleCall(

                                    response.donorPhone,

                                  )

                                }

                                className="mt-3 flex-row items-center rounded-xl bg-white px-3 py-3"

                              >

                                <Ionicons

                                  name="call-outline"

                                  size={16}

                                  color="#6B7280"

                                />

                                <Text className="ml-2 flex-1 text-[12px] font-semibold text-gray-700">

                                  {response.donorPhone ||

                                    "Phone not available"}

                                </Text>

                              </TouchableOpacity>

                              {status === "pending" && (

                                <View className="mt-3 flex-row">

                                  <TouchableOpacity

                                    disabled={responderActionLoading}

                                    onPress={() =>

                                      confirmResponder(

                                        response,

                                      )

                                    }

                                    className="mr-2 flex-1 rounded-xl bg-green-600 py-3"

                                  >

                                    <Text className="text-center text-[11px] font-black text-white">

                                      CONFIRM

                                    </Text>

                                  </TouchableOpacity>

                                  <TouchableOpacity

                                    disabled={responderActionLoading}

                                    onPress={() =>

                                      rejectResponder(

                                        response,

                                      )

                                    }

                                    className="ml-2 flex-1 rounded-xl border border-red-200 bg-white py-3"

                                  >

                                    <Text className="text-center text-[11px] font-black text-red-600">

                                      REJECT

                                    </Text>

                                  </TouchableOpacity>

                                </View>

                              )}

                              {status === "confirmed" && (

                                <TouchableOpacity

                                  disabled={responderActionLoading}

                                  onPress={() =>

                                    completeDonation(

                                      response,

                                    )

                                  }

                                  className="mt-3 rounded-xl bg-red-600 py-3.5"

                                >

                                  {responderActionLoading ? (

                                    <ActivityIndicator

                                      color="white"

                                      size="small"

                                    />

                                  ) : (

                                    <Text className="text-center text-[12px] font-black text-white">

                                      COMPLETE DONATION

                                    </Text>

                                  )}

                                </TouchableOpacity>

                              )}

                              {status === "rejected" && (

                                <View className="mt-3 rounded-xl bg-gray-100 py-3">

                                  <Text className="text-center text-[11px] font-black text-gray-500">

                                    RESPONSE REJECTED

                                  </Text>

                                </View>

                              )}

                            </View>

                          );

                        })

                      )}

                    </View>

                  ) : respondedRequestIds.includes(String(selectedRequest.id)) ? (

                    <View className="flex-row items-center justify-center rounded-2xl bg-green-50 py-4">

                      <Ionicons name="checkmark-circle" size={19} color="#16A34A" />

                      <Text className="ml-2 text-xs font-black uppercase text-green-700">Already Responded</Text>

                    </View>

                  ) : (

                    <>

                      <TouchableOpacity

                        activeOpacity={0.88}

                        disabled={donateLoading}

                        onPress={handleOfferToDonate}

                        className={`flex-row items-center justify-center rounded-2xl bg-red-600 py-4 ${

                          donateLoading ? "opacity-70" : ""

                        }`}

                      >

                        {donateLoading ? (

                          <ActivityIndicator

                            color="white"

                            size="small"

                          />

                        ) : (

                          <>

                            <Ionicons

                              name="heart"

                              size={19}

                              color="white"

                            />

                            <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">

                              I Can Donate

                            </Text>

                          </>

                        )}

                      </TouchableOpacity>

                      <TouchableOpacity

                        activeOpacity={0.85}

                        disabled={donateLoading}

                        onPress={() =>

                          handleCall(

                            selectedRequest.contactPhone,

                          )

                        }

                        className="mt-2.5 flex-row items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-4"

                      >

                        <Ionicons

                          name="call-outline"

                          size={18}

                          color="#DC2626"

                        />

                        <Text className="ml-2 text-xs font-black uppercase tracking-wider text-red-600">

                          Call Requester

                        </Text>

                      </TouchableOpacity>

                    </>

                  )}

                </View>

              </ScrollView>

            )}

          </View>

        </View>

      </Modal>

    </SafeAreaView>

  );

};

// ======================================================

// DETAIL ROW

// ======================================================

const DetailRow = ({

  icon,

  label,

  value,

}: {

  icon: any;

  label: string;

  value: string;

}) => (

  <View className="flex-row items-start">

    <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-xl bg-gray-50">

      <Ionicons

        name={icon}

        size={16}

        color="#6B7280"

      />

    </View>

    <View className="ml-3 flex-1">

      <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-400">

        {label}

      </Text>

      <Text className="mt-0.5 text-sm font-semibold text-gray-800">

        {value}

      </Text>

    </View>

  </View>

);

export default Requests;

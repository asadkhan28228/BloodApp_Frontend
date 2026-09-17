import { useEffect, useState } from "react";
import { collection, onSnapshot } from "@/src/lib/backendCompat";

import { db } from "../../config/backendConfig";

export type ImpactStats = {
  donations: number;
  livesSaved: number;
  bloodDonors: number;
  donatedMl: number;
};

const initialStats: ImpactStats = {
  donations: 0,
  livesSaved: 0,
  bloodDonors: 0,
  donatedMl: 0,
};

export const useImpactStats = () => {
  const [stats, setStats] = useState<ImpactStats>(initialStats);

  useEffect(() => {
    let users: any[] = [];
    let completedRequests = 0;
    let completedEmergencyResponses = 0;

    const updateStats = () => {
      const activeDonors = users.filter(
        (user) =>
          user.role !== "admin" &&
          user.role !== "bloodBankAdmin" &&
          user.bloodType &&
          user.isActive !== false,
      );
      const donations = activeDonors.reduce(
        (total, user) => total + Math.max(0, Number(user.donationsCount) || 0),
        0,
      );

      setStats({
        donations,
        livesSaved: completedRequests + completedEmergencyResponses,
        bloodDonors: activeDonors.length,
        donatedMl: donations * 540,
      });
    };

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot : any) => {
      users = snapshot.docs.map((document : any) => document.data());
      updateStats();
    });

    const unsubscribeRequests = onSnapshot(
      collection(db, "blood-requests"),
      (snapshot : any) => {
        completedRequests = snapshot.docs.filter(
          (document : any) => document.data().status === "Completed",
        ).length;
        updateStats();
      },
    );

    const unsubscribeCommunity = onSnapshot(
      collection(db, "community_notifications"),
      (snapshot : any) => {
        completedEmergencyResponses = snapshot.docs.filter(
          (document : any) => {
            const data = document.data();
            return (
              data.type === "emergency_response" &&
              data.responseStatus === "Completed"
            );
          },
        ).length;
        updateStats();
      },
    );

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeCommunity();
    };
  }, []);

  return stats;
};

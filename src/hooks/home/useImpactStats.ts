import { useEffect, useState } from "react";
import { apiRequest } from "@/src/lib/api";

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
    let mounted = true;

    const loadImpactStats = async () => {
      try {
        // Logged-in user's latest profile
        const profile = await apiRequest<any>("/api/auth/profile");

        // Users are still loaded to calculate active donor count
        let users: any[] = [];

        try {
          users = await apiRequest<any[]>("/api/user");
        } catch {
          try {
            users = await apiRequest<any[]>("/api/user/donors");
          } catch {
            users = [];
          }
        }

        if (!mounted) {
          return;
        }

        const donations = Math.max(
          0,
          Number(
            profile?.donationsCount ??
              profile?.DonationsCount ??
              0,
          ) || 0,
        );

        const livesSaved = Math.max(
          0,
          Number(
            profile?.livesSaved ??
              profile?.LivesSaved ??
              0,
          ) || 0,
        );

        const activeDonors = users.filter(
          (user) =>
            user.role !== "admin" &&
            user.role !== "bloodBankAdmin" &&
            user.bloodType &&
            user.isActive !== false,
        );

        setStats({
          donations,
          livesSaved,
          bloodDonors: activeDonors.length,
          donatedMl: donations * 540,
        });
      } catch (error) {
        console.error(
          "Failed to load impact stats:",
          error,
        );

        if (mounted) {
          setStats(initialStats);
        }
      }
    };

    loadImpactStats();

    // Refresh stats so confirmed donations are reflected
    // without requiring an app restart.
    const interval = setInterval(
      loadImpactStats,
      5000,
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return stats;
};
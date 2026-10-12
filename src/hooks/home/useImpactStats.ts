
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
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

const asCount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

export const useImpactStats = () => {
  const [stats, setStats] = useState<ImpactStats>(initialStats);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadImpactStats = async () => {
        try {
          const response = await apiRequest<any>(
            "/api/user/community-impact"
          );

          if (!active) return;

          const data = response?.data ?? response;

          setStats({
            donations: asCount(
              data?.donations ?? data?.Donations
            ),
            livesSaved: asCount(
              data?.livesSaved ?? data?.LivesSaved
            ),
            bloodDonors: asCount(
              data?.bloodDonors ?? data?.BloodDonors
            ),
            donatedMl: asCount(
              data?.donatedMl ?? data?.DonatedMl
            ),
          });
        } catch (error) {
          console.error(
            "Failed to load community impact:",
            error
          );
        }
      };

      void loadImpactStats();

      const interval = setInterval(
        () => void loadImpactStats(),
        15000
      );

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [])
  );

  return stats;
};

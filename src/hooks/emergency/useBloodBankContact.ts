import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "@/src/lib/backendCompat";

import { db } from "../../config/backendConfig";

export type BloodBankContact = {
  name: string;
  phoneNumber: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export const useBloodBankContact = () => {
  const [bloodBankContact, setBloodBankContact] =
    useState<BloodBankContact | null>(null);

  const fetchBloodBankContact = useCallback(async () => {
    try {
      const snapshot = await getDoc(doc(db, "settings", "bloodBank"));

      if (snapshot.exists()) {
        const data = snapshot.data();
        setBloodBankContact({
          name: data.name || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          latitude: typeof data.latitude === "number" ? data.latitude : null,
          longitude: typeof data.longitude === "number" ? data.longitude : null,
        });
      }
    } catch (error) {
      console.error("Error fetching blood bank contact:", error);
    }
  }, []);

  useEffect(() => {
    fetchBloodBankContact();
  }, [fetchBloodBankContact]);

  return { bloodBankContact };
};

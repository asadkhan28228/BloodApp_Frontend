import { apiRequest } from "../lib/api";

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export interface BloodInventoryItem {
  bloodType: string;
  units: number;
  updatedAt?: any;
}

const typeId = (bloodType: string) => encodeURIComponent(bloodType.replace(/\//g, "-"));

export const getReserveUnits = async (bloodType: string): Promise<number> => {
  if (!bloodType || bloodType === "ANY") return 0;
  try {
    const data = await apiRequest<BloodInventoryItem>(`/api/blood-inventory/${typeId(bloodType)}`);
    return typeof data?.units === "number" ? data.units : 0;
  } catch (error) {
    console.error("Error reading blood reserve:", error);
    return 0;
  }
};

export interface ReserveResult {
  reserved: boolean;
  availableUnits: number;
  remainingUnits: number;
}

export const reserveBloodFromStock = async (bloodType: string, unitsNeeded: number): Promise<ReserveResult> => {
  if (!bloodType || bloodType === "ANY" || !Number.isInteger(unitsNeeded) || unitsNeeded <= 0) {
    return { reserved: false, availableUnits: 0, remainingUnits: 0 };
  }

  try {
    const before = await getReserveUnits(bloodType);
    if (before < unitsNeeded) return { reserved: false, availableUnits: before, remainingUnits: before };

    const updated = await apiRequest<BloodInventoryItem>(
      `/api/blood-inventory/${typeId(bloodType)}/decrease?units=${unitsNeeded}`,
      { method: "PATCH" },
    );
    const remaining = typeof updated?.units === "number" ? updated.units : Math.max(0, before - unitsNeeded);
    return { reserved: true, availableUnits: before, remainingUnits: remaining };
  } catch (error) {
    console.error("Error reserving blood from stock:", error);
    const available = await getReserveUnits(bloodType);
    return { reserved: false, availableUnits: available, remainingUnits: available };
  }
};

export const releaseReservedBlood = async (bloodType: string, unitsToRelease: number): Promise<boolean> => {
  if (!bloodType || bloodType === "ANY" || !Number.isInteger(unitsToRelease) || unitsToRelease <= 0) return false;
  try {
    await apiRequest(
      `/api/blood-inventory/${typeId(bloodType)}/increase?units=${unitsToRelease}`,
      { method: "PATCH" },
    );
    return true;
  } catch (error) {
    console.error("Error releasing reserved blood:", error);
    return false;
  }
};

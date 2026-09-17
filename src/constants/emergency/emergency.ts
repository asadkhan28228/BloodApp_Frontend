import { Timestamp } from "@/src/lib/backendCompat";

export const EmergencyCategories = [
  { label: "Blast", icon: "flash-outline" },
  { label: "Fire", icon: "flame-outline" },
  { label: "Disaster", icon: "earth-outline" },
  { label: "Mass Accident", icon: "car-outline" },
  { label: "Blood Shortage", icon: "medkit-outline" },
  { label: "Critical Incident", icon: "warning-outline" },
  { label: "Rare Blood", icon: "water-outline" },
];

export const BloodTypes = [
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

export const PriorityLevels = [
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

export const CategoryDefaultPriority: Record<string, string> = {
  Blast: "Critical",
  Fire: "Critical",
  Disaster: "Critical",
  "Mass Accident": "Critical",
  "Blood Shortage": "High",
  "Critical Incident": "Critical",
  "Rare Blood": "High",
};

export const getExpiryTimestamp = () => {
  const expiryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return Timestamp.fromDate(expiryDate);
};

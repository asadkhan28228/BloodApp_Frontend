import { create } from "zustand";
import { doc, getDoc } from "@/src/lib/backendCompat";
import { db } from "../config/backendConfig";

export type UserRole = "user" | "admin" | "bloodBankAdmin";

export const isAdminRole = (role?: UserRole) =>
  role === "admin" || role === "bloodBankAdmin";

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  bloodType: string;

  location?: string;

  // GPS location for nearby donor distance
  latitude?: number;
  longitude?: number;

  availableToDonate?: boolean;
  lastDonationDate?: any;
  avatarUrl?: string;
  gender?: string;
  createdAt?: string;

  // Admin system
  role?: UserRole;
  

  // Account status
  isActive?: boolean;
}

interface UserState {
  user: UserProfile | null;

  loading: boolean;

  setUser: (
    user: UserProfile | null
  ) => void;

  fetchUser: (
    uid: string
  ) => Promise<void>;

  clearUser: () => void;
}

export const useUserStore =
  create<UserState>((set) => ({
    user: null,

    loading: false,

    setUser: (user) =>
      set({
        user,
      }),

    fetchUser: async (uid) => {
      set({
        loading: true,
      });

      try {
        const userDoc =
          await getDoc(
            doc(
              db,
              "users",
              uid
            )
          );

        if (userDoc.exists()) {
          const userData =
            userDoc.data() as UserProfile;

          set({
            user: userData,
          });
        } else {
          console.log(
            "User document not found"
          );

          set({
            user: null,
          });
        }
      } catch (error) {
        console.error(
          "Error fetching user in store:",
          error
        );

        set({
          user: null,
        });
      } finally {
        set({
          loading: false,
        });
      }
    },

    clearUser: () => {
      set({
        user: null,
      });
    },
  }));
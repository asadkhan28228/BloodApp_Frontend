import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";

export type ReservedDialogData = {
  emergencyId: string;
  unitsNeeded: number;
  bloodType: string;
  onDone: () => void;
};

type EmergencyReservedDialogProps = {
  dialog: ReservedDialogData | null;
  onClose: () => void;
};

const EmergencyReservedDialog = ({
  dialog,
  onClose,
}: EmergencyReservedDialogProps) => (
  <Modal
    visible={dialog !== null}
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
              {dialog?.emergencyId}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center rounded-2xl border border-green-100 bg-green-50 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons name="water" size={21} color="#16A34A" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-black text-green-900">
                {dialog?.unitsNeeded} unit(s) of {dialog?.bloodType}
              </Text>
              <Text className="mt-1 text-xs font-medium text-green-700">
                Reserved from the blood bank. No donor search was needed.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              const onDone = dialog?.onDone;
              onClose();
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
);

export default EmergencyReservedDialog;

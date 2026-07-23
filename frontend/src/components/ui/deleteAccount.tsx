import { useState } from "react";
import { Modal, View, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Button } from "./button";
import { Text } from "./text";
import { useAuth } from "@/context/AuthContext";
import { deleteAccount } from "@/api/users";
import { getApiErrorMessage } from "@/api/client";
import { useTranslation } from 'react-i18next';

export function DeleteAccountButton({ role }: { role: "student" | "teacher" }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [visible, setVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setError(null);
    setVisible(true);
  };

  const closeModal = () => {
    if (deleting) return;
    setVisible(false);
  };

  const handleConfirm = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      setVisible(false);
      await signOut();
    } catch (e) {
      setError(getApiErrorMessage(e, t('commonUI.deleteFailed')));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button variant="destructive" className="mt-3" onPress={openModal}>
        <Text className="text-white font-bold">{t('commonUI.deleteAccount')}</Text>
      </Button>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
        <View className="flex-1 bg-black/50 items-center justify-center justify-center px-6">
          <View className="bg-background w-full max-w-sm rounded-3xl p-6">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-12 h-12 bg-destructive/15 rounded-2xl items-center justify-center">
                <Feather name="alert-triangle" size={24} color="#EF4444" />
              </View>
              <Text className="text-foreground text-lg font-bold">{t('commonUI.deleteTitle')}</Text>
            </View>
            <Text className="text-muted-foreground text-sm">
              {t('commonUI.deleteDesc')}
            </Text>

            {role === "teacher" && (
              <Text className="text-muted-foreground text-sm mt-2">
                {t('commonUI.deleteTeacherNote')}
              </Text>
            )}

            {error && (
              <View className="bg-destructive/10 p-3 rounded-xl mt-3 flex-row items-center gap-2">
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text className="text-destructive text-xs flex-1">{error}</Text>
              </View>
            )}

            <View className="flex-row gap-3 mt-5">
              <Button variant="outline" className="flex-1" onPress={closeModal} disabled={deleting}>
                <Text className="font-semibold">{t('commonUI.back')}</Text>
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onPress={() => void handleConfirm()}
                disabled={deleting}
              >
                {deleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-white font-bold">{t('commonUI.delete')}</Text>}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

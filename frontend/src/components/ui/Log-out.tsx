import { Button } from "./button";
import { Text } from "./text";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from 'react-i18next';
import { useState } from "react";

export function LogoutButton() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
  <Button variant="outline" className="mt-2" onPress={() => void handleSignOut()} disabled={loading}>
    <Text className="text-destructive font-bold">{loading ? t('commonUI.signingOut') : t('commonUI.logout')}</Text>
  </Button>
  );
}

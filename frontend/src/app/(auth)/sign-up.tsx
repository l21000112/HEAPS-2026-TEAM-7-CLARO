import "../../../global.css";
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Text } from '@/components/ui/text';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { useTranslation } from 'react-i18next';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/api/users';
import { getApiErrorMessage } from '@/api/client';
import { useTheme } from '@/context/themeContext';
import { colors } from '@/styles/global';

function mapAuthError(code: string | undefined, t: (k: string) => string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return t('auth.accountExists');
    case 'auth/invalid-email':
      return t('auth.invalidEmail');
    case 'auth/weak-password':
      return t('auth.weakPassword');
    case 'auth/network-request-failed':
      return t('auth.networkError');
    default:
      return t('auth.genericCreateError');
  }
}

export default function SignUpScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await cred.user.getIdToken();
      await createUserProfile({
        displayName: name.trim(),
        inviteCode: invite.trim() || undefined,
      });
      await refreshProfile();
      router.replace('/' as Href);
    } catch (e: any) {
      if (auth.currentUser) {
        await auth.signOut();
      }
      if (e?.status || e?.message) {
        setError(getApiErrorMessage(e, t('auth.setupFailed')));
      } else {
        setError(mapAuthError(e?.code, t));
      }
    } finally {
      setLoading(false);
    }
  };

  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';

  return (
    <View className={`flex-1 bg-background ${isDark ? 'dark' : ''}`}>
      <ScrollView
        style={{ flex: 1, marginBottom: keyboardHeight }}
        contentContainerClassName="grow justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-foreground text-center">
          {t('auth.createAccountTitle')}
        </Text>
        <Text className="text-muted-foreground text-center mt-2 mb-8">
          {t('auth.createAccountSubtitle')}
        </Text>

        <View className="mb-5">
          <LanguagePicker hideLabel />
        </View>

        <TextInput
          className="bg-input text-foreground rounded-xl px-4 py-3.5 text-base mb-3.5"
          placeholder={t('auth.displayName')}
          placeholderTextColor={placeholderColor}
          returnKeyType="next"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
        />

        <TextInput
          className="bg-input text-foreground rounded-xl px-4 py-3.5 text-base mb-3.5"
          placeholder={t('auth.email')}
          placeholderTextColor={placeholderColor}
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          className="bg-input text-foreground rounded-xl px-4 py-3.5 text-base mb-3.5"
          placeholder={t('auth.inviteCode')}
          placeholderTextColor={placeholderColor}
          returnKeyType="next"
          value={invite}
          onChangeText={setInvite}
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          className="bg-input text-foreground rounded-xl px-4 py-3.5 text-base mb-3.5"
          placeholder={t('auth.password')}
          placeholderTextColor={placeholderColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          editable={!loading}
          returnKeyType="go"
          onSubmitEditing={handleSignUp}
        />

        {error ? (
          <Text className="text-destructive text-sm mb-3.5">
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          className={`bg-primary py-4 rounded-xl items-center mt-1.5 ${
            loading ? 'opacity-60' : ''
          }`}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0b1020" />
          ) : (
            <Text className="text-primary-foreground text-base font-bold">
              {t('auth.createAccountButton')}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')}</Text>
          <TouchableOpacity onPress={() => router.push('/sign-in' as Href)}>
            <Text style={styles.link}>{t('auth.signInLink')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
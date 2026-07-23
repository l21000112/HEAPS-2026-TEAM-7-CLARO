import "../../../global.css";
import { useState, useEffect } from 'react';
import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Link, useRouter, type Href } from 'expo-router';
import { Text } from '@/components/ui/text';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/context/themeContext';
import { colors } from '@/styles/global';
import { CatChubby } from "@/lib/images";
// Turn Firebase's error codes into something a person can read.
function mapAuthError(code: string | undefined, t: (k: string) => string): string {
  switch (code) {
    case 'auth/invalid-email':
      return t('auth.invalidEmail');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t('auth.incorrectCredentials');
    case 'auth/user-disabled':
      return t('auth.accountDisabled');
    case 'auth/too-many-requests':
      return t('auth.tooManyAttempts');
    case 'auth/network-request-failed':
      return t('auth.networkError');
    default:
      return t('auth.genericSignInError');
  }
}

export default function SignInScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
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

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError(t('auth.enterEmailPassword'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/' as Href);
    } catch (e: any) {
      setError(mapAuthError(e?.code, t));
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
        <Image
          source={CatChubby}
          style={{ width: 120, height: 120, alignSelf: 'center' }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={t('auth.catAlt')}
        />
        <Text className="text-3xl font-bold text-foreground text-center">
          {t('auth.signInTitle')}
        </Text>
        <Text className="text-muted-foreground text-center mt-2 mb-6">
          {t('auth.signInSubtitle')}
        </Text>

        <View className="mb-5">
          <LanguagePicker hideLabel />
        </View>

        <TextInput
          className="bg-input text-foreground rounded-xl px-4 py-3.5 text-base mb-3.5"
          placeholder={t('auth.email')}
          placeholderTextColor={placeholderColor}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          textContentType="emailAddress"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          className="bg-input text-foreground rounded-xl px-4 py-3.5 text-base mb-3.5"
          placeholder={t('auth.passwordShort')}
          placeholderTextColor={placeholderColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          editable={!loading}
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
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
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0b1020" />
          ) : (
            <Text className="text-primary-foreground text-base font-bold">
              {t('auth.signInButton')}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
          <Link href={'/sign-up' as Href} style={styles.link}>
            {t('auth.signUpLink')}
          </Link>
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

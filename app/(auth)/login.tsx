import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, ShieldCheck, LogIn, UserPlus, Key, Sparkles, User, AlertCircle } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useUser } from '@/context/UserContext';

export default function LoginScreen() {
  const router = useRouter();
  const { profile, loginWithCredentials, unlockSession, resetOnboarding } = useUser();

  const [username, setUsername] = useState(() => profile.identity.displayName || '');
  const [pinOrCode, setPinOrCode] = useState('NASH-25');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = () => {
    if (!username.trim()) {
      setErrorMsg('Please enter your Display Name, Phone, or Email.');
      return;
    }
    if (!pinOrCode.trim()) {
      setErrorMsg('Please enter your 4-Digit PIN or Event Room Code.');
      return;
    }

    const success = loginWithCredentials(username, pinOrCode);
    if (success) {
      setErrorMsg('');
      router.replace('/(tabs)' as any);
    } else {
      setErrorMsg('Invalid PIN or Room Code. Try "NASH-25" or any 4-digit PIN.');
    }
  };

  const handleQuickResume = () => {
    unlockSession();
    router.replace('/(tabs)' as any);
  };

  const handleStartNewOnboarding = () => {
    resetOnboarding();
    router.replace('/(onboarding)/step1-identity' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          
          {/* Header Branding */}
          <View style={s.headerBox}>
            <View style={s.iconRing}>
              <Lock size={32} color={Colors.accent.copper} />
            </View>
            <Text style={Typography.header}>Session Locked</Text>
            <Text style={s.headerSub}>
              Enter credentials or quick resume to access your private lifestyle profile & event games.
            </Text>
          </View>

          {/* Privacy Protection Banner */}
          <View style={s.privacyCard}>
            <ShieldCheck size={20} color={Colors.accent.copper} />
            <Text style={s.privacyText}>
              Session lock keeps your play boundaries, preferred matches, and venue check-ins strictly confidential.
            </Text>
          </View>

          {/* Error Message */}
          {errorMsg ? (
            <View style={s.errCard}>
              <AlertCircle size={16} color={Colors.accent.crimson} />
              <Text style={s.errText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Sign In Form */}
          <View style={s.formCard}>
            <Text style={s.cardHeaderTitle}>SIGN IN / UNLOCK SESSION</Text>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Display Name, Phone, or Email</Text>
              <View style={s.inputWrap}>
                <User size={18} color={Colors.accent.copper} style={{ marginRight: 8 }} />
                <TextInput
                  style={s.input}
                  placeholder="e.g. Alex_Vibe or user@example.com"
                  placeholderTextColor={Colors.text.muted}
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    setErrorMsg('');
                  }}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>4-Digit PIN or Event Room Code</Text>
              <View style={s.inputWrap}>
                <Key size={18} color={Colors.accent.copper} style={{ marginRight: 8 }} />
                <TextInput
                  style={s.input}
                  placeholder="e.g. NASH-25 or 1234"
                  placeholderTextColor={Colors.text.muted}
                  value={pinOrCode}
                  onChangeText={(val) => {
                    setPinOrCode(val);
                    setErrorMsg('');
                  }}
                  autoCapitalize="characters"
                />
              </View>
              <Text style={s.hintText}>Default Event Code: NASH-25 (or any 4-digit PIN)</Text>
            </View>

            <TouchableOpacity style={s.signInBtn} onPress={handleSignIn}>
              <LogIn size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={s.signInBtnText}>Sign In & Unlock Session</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Resume Button (If Profile Exists) */}
          {profile.identity.displayName ? (
            <TouchableOpacity style={s.resumeCard} onPress={handleQuickResume}>
              <View style={s.resumeIconBox}>
                <Sparkles size={20} color={Colors.accent.copper} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resumeTitle}>Quick Resume</Text>
                <Text style={s.resumeSub}>Continue as {profile.identity.displayName}</Text>
              </View>
              <Text style={s.resumeBadge}>ACTIVE</Text>
            </TouchableOpacity>
          ) : null}

          {/* Start New Guest Onboarding */}
          <TouchableOpacity style={s.newGuestBtn} onPress={handleStartNewOnboarding}>
            <UserPlus size={18} color={Colors.text.secondary} style={{ marginRight: 8 }} />
            <Text style={s.newGuestBtnText}>Start New Guest Onboarding</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerBox: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg, paddingHorizontal: Spacing.sm },
  iconRing: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.background.darkSteel, borderWidth: 2, borderColor: Colors.accent.copper, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  headerSub: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(200, 109, 81, 0.12)', borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  privacyText: { flex: 1, color: Colors.text.primary, fontSize: 12, lineHeight: 17 },
  errCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(217, 56, 58, 0.15)', borderWidth: 1, borderColor: Colors.accent.crimson, borderRadius: BorderRadius.md, padding: 12, marginBottom: Spacing.md },
  errText: { color: Colors.accent.crimson, fontSize: 12, fontWeight: '700', flex: 1 },
  formCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeaderTitle: { fontSize: 11, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 1, marginBottom: Spacing.md },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, marginBottom: 6, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, fontSize: 14, color: Colors.text.primary, fontWeight: '600' },
  hintText: { fontSize: 11, color: Colors.text.muted, marginTop: 4, fontStyle: 'italic' },
  signInBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
  signInBtnText: { color: Colors.text.primary, fontSize: 15, fontWeight: '800' },
  resumeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: 12 },
  resumeIconBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#231B18', borderWidth: 1, borderColor: Colors.accent.copper, justifyContent: 'center', alignItems: 'center' },
  resumeTitle: { fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  resumeSub: { fontSize: 12, color: Colors.text.secondary },
  resumeBadge: { fontSize: 10, fontWeight: '800', color: Colors.accent.emerald, backgroundColor: 'rgba(46, 175, 125, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  newGuestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, paddingVertical: 14 },
  newGuestBtnText: { color: Colors.text.secondary, fontSize: 14, fontWeight: '700' },
});

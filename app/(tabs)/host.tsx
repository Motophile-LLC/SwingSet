import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Sliders, Radio, Zap, Trophy, RefreshCw, Send, ShieldAlert, Check } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useGame, GameMode } from '@/context/GameContext';

const GAME_MODES: { mode: GameMode; title: string; desc: string; icon: any }[] = [
  { mode: 'chameleon', title: 'Chameleon Color Match', desc: 'Beacon color clusters.', icon: Zap },
  { mode: 'bingo', title: 'Trait Hunt Blitz', desc: 'Find guests matching prompt.', icon: Trophy },
  { mode: 'partnerCheckIn', title: 'Couple Check-In', desc: 'Prompt coupled check-ins.', icon: Sliders },
];

export default function HostDeckScreen() {
  const { activeGameMode, setGameMode, bingoPrompt, setBingoPrompt, resetGameData } = useGame();
  const [customPrompt, setCustomPrompt] = useState(bingoPrompt);
  const [alertMsg, setAlertMsg] = useState('');

  const handlePushPrompt = () => {
    if (!customPrompt.trim()) return;
    setBingoPrompt(customPrompt.trim());
    setAlertMsg('Prompt pushed to arena!');
    setTimeout(() => setAlertMsg(''), 3000);
  };

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    setAlertMsg(`Switched to ${mode.toUpperCase()}!`);
    setTimeout(() => setAlertMsg(''), 3000);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.hostHeader}>
          <Radio size={20} color={Colors.accent.copper} />
          <View style={{ flex: 1 }}>
            <Text style={s.hostTitle}>EVENT HOST CONTROLLER</Text>
            <Text style={s.hostSub}>Control active rounds & push alerts</Text>
          </View>
        </View>

        {alertMsg ? (
          <View style={s.alertBox}>
            <ShieldAlert size={16} color={Colors.accent.emerald} />
            <Text style={s.alertText}>{alertMsg}</Text>
          </View>
        ) : null}

        <View style={s.group}>
          <Text style={s.label}>Active Round Mode</Text>
          {GAME_MODES.map((item) => {
            const Icon = item.icon;
            const sel = activeGameMode === item.mode;
            return (
              <TouchableOpacity key={item.mode} style={[s.modeCard, sel && s.modeCardSel]} onPress={() => handleModeChange(item.mode)}>
                <View style={s.modeRow}>
                  <Icon size={18} color={sel ? Colors.accent.copper : Colors.border.brushedSteel} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modeTitle, sel && { color: Colors.accent.copper }]}>{item.title}</Text>
                    <Text style={s.modeDesc}>{item.desc}</Text>
                  </View>
                  {sel && <View style={s.check}><Check size={10} color="#FFF" /></View>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Push Custom Trait Prompt</Text>
          <TextInput style={s.input} value={customPrompt} onChangeText={setCustomPrompt} placeholder="Enter prompt..." placeholderTextColor={Colors.text.muted} />
          <TouchableOpacity style={s.pushBtn} onPress={handlePushPrompt}>
            <Send size={14} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={s.pushBtnText}>Push Prompt to Arena</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.resetBtn} onPress={resetGameData}>
          <RefreshCw size={14} color={Colors.accent.crimson} style={{ marginRight: 6 }} />
          <Text style={s.resetBtnText}>Reset Round & Points Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  hostHeader: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  hostTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 0.5 },
  hostSub: { fontSize: 11, color: Colors.text.secondary },
  alertBox: { backgroundColor: 'rgba(46, 175, 125, 0.15)', borderWidth: 1, borderColor: Colors.accent.emerald, borderRadius: BorderRadius.md, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  alertText: { color: Colors.accent.emerald, fontWeight: '700', fontSize: 12 },
  group: { marginBottom: Spacing.md },
  label: { fontSize: 11, fontWeight: '800', color: Colors.text.primary, marginBottom: 6, textTransform: 'uppercase' },
  modeCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 10, marginBottom: 6 },
  modeCardSel: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  modeDesc: { fontSize: 11, color: Colors.text.secondary },
  check: { backgroundColor: Colors.accent.copper, borderRadius: 99, padding: 2 },
  card: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { fontSize: 12, fontWeight: '700', color: Colors.text.primary, marginBottom: 6 },
  input: { backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 8, color: Colors.text.primary, fontSize: 13, marginBottom: 8 },
  pushBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pushBtnText: { color: Colors.text.primary, fontWeight: '800', fontSize: 13 },
  resetBtn: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.accent.crimson, borderRadius: BorderRadius.md, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { color: Colors.accent.crimson, fontSize: 13, fontWeight: '700' },
});

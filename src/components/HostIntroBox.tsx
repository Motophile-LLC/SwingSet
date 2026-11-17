import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react-native';
import { BorderRadius, Colors } from '@/constants/theme';

interface HostIntroBoxProps {
  gameTitle: string;
  readAloudScript: string;
  howToPlay: string[];
  defaultExpanded?: boolean;
}

export function HostIntroBox({
  gameTitle,
  readAloudScript,
  howToPlay,
  defaultExpanded = true,
}: HostIntroBoxProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={s.box}>
      <TouchableOpacity
        style={s.header}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.8}
      >
        <Megaphone size={15} color={Colors.accent.copper} />
        <Text style={s.headerTitle}>
          HOST INTRO ({gameTitle.toUpperCase()}) — READ ALOUD
        </Text>
        {expanded ? (
          <ChevronUp size={16} color={Colors.text.secondary} />
        ) : (
          <ChevronDown size={16} color={Colors.text.secondary} />
        )}
      </TouchableOpacity>

      {expanded ? (
        <View style={s.body}>
          <View style={s.scriptCard}>
            <Text style={s.scriptText}>{readAloudScript}</Text>
          </View>
          <View style={s.bullets}>
            {howToPlay.map((step, i) => (
              <Text key={i} style={s.bulletText}>
                {i + 1}. {step}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: 10,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text.copper,
    letterSpacing: 0.4,
  },
  body: {
    gap: 8,
  },
  scriptCard: {
    backgroundColor: Colors.background.inputBg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent.copper,
    borderRadius: BorderRadius.sm,
    padding: 10,
  },
  scriptText: {
    color: Colors.text.primary,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  bullets: {
    gap: 4,
    paddingHorizontal: 2,
  },
  bulletText: {
    color: Colors.text.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
});

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BookUser,
  Check,
  Clock,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { TapTonightRecord, UnlockedContactPayload } from '../types/swingset';
import { ContactExchangeService } from '../services/contactExchangeService';

interface TapsTonightDrawerProps {
  visible: boolean;
  userId: string;
  eventId?: string;
  exchangeService: ContactExchangeService;
  onClose: () => void;
}

export const TapsTonightDrawer: React.FC<TapsTonightDrawerProps> = ({
  visible,
  userId,
  eventId,
  exchangeService,
  onClose,
}) => {
  const [tab, setTab] = useState<'taps' | 'address_book'>('taps');
  const [loading, setLoading] = useState(false);
  const [taps, setTaps] = useState<TapTonightRecord[]>([]);
  const [addressBook, setAddressBook] = useState<UnlockedContactPayload[]>([]);

  const loadData = async () => {
    setLoading(true);
    const [tapRows, bookRows] = await Promise.all([
      exchangeService.getTapsHistory(userId, eventId),
      exchangeService.getPermanentAddressBook(userId),
    ]);
    setTaps(tapRows);
    setAddressBook(bookRows);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) loadData();
  }, [visible, userId, eventId]);

  const handleRequest = async (item: TapTonightRecord) => {
    await exchangeService.requestContactExchange({
      eventId: item.event_id,
      requesterUserId: userId,
      recipientUserId: item.partner_user_id,
    });
    await loadData();
  };

  const handleRespond = async (exchangeId: string, accept: boolean) => {
    await exchangeService.respondToContactExchange({
      exchangeId,
      recipientUserId: userId,
      accept,
    });
    await loadData();
  };

  const renderUnlockedDetails = (contact: UnlockedContactPayload) => (
    <View style={styles.unlockedBox}>
      {contact.phone ? <Text style={styles.fieldLine}>Phone: {contact.phone}</Text> : null}
      {contact.email ? <Text style={styles.fieldLine}>Email: {contact.email}</Text> : null}
      {contact.instagram ? <Text style={styles.fieldLine}>Instagram: {contact.instagram}</Text> : null}
      {contact.club_account ? (
        <Text style={styles.fieldLine}>Club Account: {contact.club_account}</Text>
      ) : null}
      {contact.sls ? <Text style={styles.fieldLine}>SLS: {contact.sls}</Text> : null}
      {contact.custom_fields?.map((cf, i) => (
        <Text key={i} style={styles.fieldLine}>
          {cf.label}: {cf.value}
        </Text>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Connections</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X color="#F8FAFC" size={22} />
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, tab === 'taps' && styles.tabBtnActive]}
            onPress={() => setTab('taps')}
          >
            <Text style={[styles.tabText, tab === 'taps' && styles.tabTextActive]}>
              Taps Tonight ({taps.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'address_book' && styles.tabBtnActive]}
            onPress={() => setTab('address_book')}
          >
            <BookUser color={tab === 'address_book' ? '#FFFFFF' : '#94A3B8'} size={16} />
            <Text style={[styles.tabText, tab === 'address_book' && styles.tabTextActive]}>
              Saved Contacts ({addressBook.length})
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#C084FC" style={{ marginTop: 40 }} />
        ) : tab === 'taps' ? (
          <FlatList
            data={taps}
            keyExtractor={(item) => item.tap_id}
            contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No verified taps yet. Tap phones during a round to build your private list!
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  {item.partner_photo_url ? (
                    <Image source={{ uri: item.partner_photo_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {item.partner_display_name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerName}>{item.partner_display_name}</Text>
                    <Text style={styles.contextText}>{item.interaction_context}</Text>
                  </View>
                </View>

                {item.exchange_status === 'accepted' && item.unlocked_contact ? (
                  <>
                    <View style={styles.mutualBadge}>
                      <ShieldCheck color="#34D399" size={16} />
                      <Text style={styles.mutualBadgeText}>Mutual Contact Unlocked</Text>
                    </View>
                    {renderUnlockedDetails(item.unlocked_contact)}
                  </>
                ) : item.exchange_status === 'incoming_pending' && item.exchange_id ? (
                  <View style={styles.incomingRow}>
                    <Text style={styles.incomingLabel}>Wants to exchange contact info:</Text>
                    <View style={styles.actionBtns}>
                      <Pressable
                        style={styles.acceptBtn}
                        onPress={() => handleRespond(item.exchange_id!, true)}
                      >
                        <Check color="#FFFFFF" size={16} />
                        <Text style={styles.btnText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={styles.declineBtn}
                        onPress={() => handleRespond(item.exchange_id!, false)}
                      >
                        <Text style={styles.declineText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : item.exchange_status === 'pending' ? (
                  <View style={styles.statusPill}>
                    <Clock color="#FBBF24" size={15} />
                    <Text style={styles.pendingText}>Request Sent — Awaiting Mutual Accept</Text>
                  </View>
                ) : item.exchange_status === 'declined' ? (
                  <Text style={styles.declinedText}>Exchange Declined</Text>
                ) : (
                  <Pressable style={styles.requestBtn} onPress={() => handleRequest(item)}>
                    <Send color="#FFFFFF" size={16} />
                    <Text style={styles.btnText}>Request Contact Exchange</Text>
                  </Pressable>
                )}
              </View>
            )}
          />
        ) : (
          <FlatList
            data={addressBook}
            keyExtractor={(_, idx) => String(idx)}
            contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Mutually accepted contacts from all your SwingSet events live here permanently.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.partnerName}>{item.display_name}</Text>
                {renderUnlockedDetails(item)}
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 999,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  tabBtnActive: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#312E81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  partnerName: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  contextText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  incomingRow: {
    gap: 8,
  },
  incomingLabel: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
  },
  declineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
  },
  declineText: {
    color: '#CBD5E1',
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
  },
  pendingText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '600',
  },
  declinedText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  mutualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mutualBadgeText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
  },
  unlockedBox: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  fieldLine: {
    color: '#F8FAFC',
    fontSize: 14,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 20,
  },
});
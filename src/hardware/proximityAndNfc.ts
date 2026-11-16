import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export interface NearbyBlePeer {
  ephemeralBleId: string;
  rssi: number; // e.g., -55 dBm (~1.5m), -75 dBm (~4m)
  lastSeenAt: number;
}

const PROXIMITY_RSSI_THRESHOLD = -72; // ~2.5 to 3 meters max range for short-code fallback
const PEER_STALE_MS = 6000;
const WAKE_LOCK_TAG = 'swingset-active-round';

export class SwingSetHardwareController {
  private nearbyPeers = new Map<string, NearbyBlePeer>();
  private nfcModule: any = null;

  /**
   * 1. SCREEN WAKE-LOCK: Keeps iOS/Android screen awake during active Scramble & Mingle rounds
   */
  public async acquireWakeLock(): Promise<void> {
    try {
      await activateKeepAwakeAsync(WAKE_LOCK_TAG);
    } catch {
      // Safe fallback if device restricts keep-awake
    }
  }

  public async releaseWakeLock(): Promise<void> {
    try {
      await deactivateKeepAwake(WAKE_LOCK_TAG);
    } catch {
      // Ignore
    }
  }

  /**
   * 2. NATIVE HAPTIC SIGNATURES (expo-haptics): Eyes-up tactile feedback
   */
  public async triggerHaptic(
    pattern: 'catalyst_received' | 'tap_confirmed' | 'mingle_start' | 'hot_proximity'
  ): Promise<void> {
    try {
      switch (pattern) {
        case 'catalyst_received':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, 140);
          break;
        case 'tap_confirmed':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'mingle_start':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 180);
          break;
        case 'hot_proximity':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
      }
    } catch {
      // Safe no-op on web preview or simulators without haptic motor
    }
  }

  /**
   * 3. NFC TAP LISTENER (Gracefully uses react-native-nfc-manager in Dev Builds,
   *    and safely falls back to BLE + 3-char code in Expo Go / Web)
   */
  public async startNfcScan(onTagScanned: (payloadText: string) => void): Promise<boolean> {
    try {
      // Dynamic require so Expo Go does not crash when native NFC module isn't linked
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const NfcManagerModule = require('react-native-nfc-manager');
      const NfcManager = NfcManagerModule.default;
      const NfcTech = NfcManagerModule.NfcTech;
      const Ndef = NfcManagerModule.Ndef;

      const supported = await NfcManager.isSupported();
      if (!supported) return false;

      await NfcManager.start();
      this.nfcModule = NfcManager;

      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (tag?.ndefMessage?.length > 0) {
        const text = Ndef.text.decodePayload(tag.ndefMessage[0].payload);
        if (text) onTagScanned(text);
      }
      return true;
    } catch {
      // Expected in Expo Go or devices without NFC enabled -> use 3-char code fallback
      return false;
    }
  }

  public async stopNfcScan(): Promise<void> {
    try {
      if (this.nfcModule) {
        await this.nfcModule.cancelTechnologyRequest();
        this.nfcModule = null;
      }
    } catch {
      // Ignore
    }
  }

  /**
   * 4. BLE PROXIMITY & ANTI-CHEAT GATE
   */
  public recordBleSighting(ephemeralBleId: string, rssi: number): void {
    this.nearbyPeers.set(ephemeralBleId, {
      ephemeralBleId,
      rssi,
      lastSeenAt: Date.now(),
    });
  }

  public isPeerWithinProximity(
    targetEphemeralBleId: string,
    enforceHardwarePresence = true
  ): boolean {
    if (!enforceHardwarePresence) return true;
    const peer = this.nearbyPeers.get(targetEphemeralBleId);
    if (!peer) return false;

    const isFresh = Date.now() - peer.lastSeenAt <= PEER_STALE_MS;
    const isCloseEnough = peer.rssi >= PROXIMITY_RSSI_THRESHOLD;
    return isFresh && isCloseEnough;
  }

  public getClosestPeerIds(): string[] {
    const now = Date.now();
    return Array.from(this.nearbyPeers.values())
      .filter((p) => now - p.lastSeenAt <= PEER_STALE_MS * 2)
      .sort((a, b) => b.rssi - a.rssi)
      .map((p) => p.ephemeralBleId);
  }
}
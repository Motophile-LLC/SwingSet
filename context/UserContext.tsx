import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import {
  AttendeeBucketType,
  CustomContactField,
  GenderType,
  InterestedInType,
  SubscriptionStatus,
  SubscriptionTier,
} from '@/src/types/swingset';

export type WhoYouAreType = AttendeeBucketType; // 'single' | 'couple' | 'group'
export type PlayStyleType = 'Play Together as a Unit' | 'Mingle Separately with Check-Ins';

export interface UserIdentity {
  displayName: string;
  ssoFullName: string;
  avatarUrl: string;
  homeCity: string;
  whoYouAre: WhoYouAreType | '';
  gender: GenderType;
  interestedIn: InterestedInType[];
  bioTagline: string;
  karaokeSong: string;
  favoriteTravelSpot: string;
  hiddenSkill: string;
}

export interface PartnerInfo {
  linkCode: string;
  enteredCode: string;
  isLinked: boolean;
  partnerName: string;
  playStyle: PlayStyleType;
}

export interface PreferencesInfo {
  lookingFor: string[];
  playBoundaries: string[];
}

export interface ContactVaultInfo {
  phone: string;
  email: string;
  instagram: string;
  clubAccount: string;
  sls: string;
  customFields: CustomContactField[];
}

export interface MembershipInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  canHostEvents: boolean;
}

export interface UserProfileState {
  userId: string | null;
  identity: UserIdentity;
  partner: PartnerInfo;
  preferences: PreferencesInfo;
  contactVault: ContactVaultInfo;
  membership: MembershipInfo;
  isOnboardingCompleted: boolean;
  swingsetOptedIn: boolean;
}

export interface SupabaseProfileRow {
  id: string;
  default_display_name?: string | null;
  sso_full_name?: string | null;
  avatar_url?: string | null;
  bucket_type?: AttendeeBucketType | null;
  gender?: GenderType | null;
  interested_in?: string[] | null;
  bio_tagline?: string | null;
  karaoke_song?: string | null;
  favorite_travel_spot?: string | null;
  hidden_skill?: string | null;
  play_style?: string | null;
  play_boundaries?: string[] | null;
  partner_link_code?: string | null;
  linked_partner_code?: string | null;
  onboarding_completed?: boolean | null;
  home_city?: string | null;
  swingset_opted_in?: boolean | null;
  swingset_accepted_at?: string | null;
  subscription_tier?: SubscriptionTier | null;
  subscription_status?: SubscriptionStatus | null;
  can_host_events?: boolean | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_instagram?: string | null;
  contact_club_account?: string | null;
  contact_sls?: string | null;
  contact_custom_fields?: CustomContactField[] | null;
}

export const generateRandomPartnerCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

interface UserContextType {
  profile: UserProfileState;
  isSessionLocked: boolean;
  isLoadingProfile: boolean;
  updateIdentity: (data: Partial<UserIdentity>) => void;
  updatePartner: (data: Partial<PartnerInfo>) => void;
  updatePreferences: (data: Partial<PreferencesInfo>) => void;
  updateContactVault: (data: Partial<ContactVaultInfo>) => void;
  updateMembership: (data: Partial<MembershipInfo>) => void;
  hydrateFromSupabaseProfile: (row: SupabaseProfileRow, isComplete?: boolean) => void;
  refreshProfileFromSupabase: () => Promise<SupabaseProfileRow | null>;
  generatePartnerCode: () => string;
  completeOnboarding: () => void;
  acceptSwingSetGate: () => Promise<void>;
  resetOnboarding: () => void;
  lockSession: () => void;
  unlockSession: () => void;
  loginWithCredentials: (nameOrEmail: string, pinOrCode: string) => boolean;
  logout: () => void;
}

const initialIdentity: UserIdentity = {
  displayName: '',
  ssoFullName: '',
  avatarUrl: '',
  homeCity: '',
  whoYouAre: 'single',
  gender: 'man',
  interestedIn: ['everyone'],
  bioTagline: '',
  karaokeSong: '',
  favoriteTravelSpot: '',
  hiddenSkill: '',
};

const createInitialPartner = (): PartnerInfo => ({
  linkCode: generateRandomPartnerCode(),
  enteredCode: '',
  isLinked: false,
  partnerName: '',
  playStyle: 'Play Together as a Unit',
});

const initialPreferences: PreferencesInfo = {
  lookingFor: ['everyone'],
  playBoundaries: ['Social / Vibe Check Only'],
};

const initialContactVault: ContactVaultInfo = {
  phone: '',
  email: '',
  instagram: '',
  clubAccount: '',
  sls: '',
  customFields: [],
};

const initialMembership: MembershipInfo = {
  tier: 'free',
  status: 'none',
  canHostEvents: true,
};

const createInitialProfile = (): UserProfileState => ({
  userId: null,
  identity: initialIdentity,
  partner: createInitialPartner(),
  preferences: initialPreferences,
  contactVault: initialContactVault,
  membership: initialMembership,
  isOnboardingCompleted: false,
  swingsetOptedIn: false,
});

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfileState>(createInitialProfile);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  const updateIdentity = useCallback((data: Partial<UserIdentity>) => {
    setProfile((prev) => ({
      ...prev,
      identity: { ...prev.identity, ...data },
    }));
  }, []);

  const updatePartner = useCallback((data: Partial<PartnerInfo>) => {
    setProfile((prev) => ({
      ...prev,
      partner: { ...prev.partner, ...data },
    }));
  }, []);

  const updatePreferences = useCallback((data: Partial<PreferencesInfo>) => {
    setProfile((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...data },
    }));
  }, []);

  const updateContactVault = useCallback((data: Partial<ContactVaultInfo>) => {
    setProfile((prev) => ({
      ...prev,
      contactVault: { ...prev.contactVault, ...data },
    }));
  }, []);

  const updateMembership = useCallback((data: Partial<MembershipInfo>) => {
    setProfile((prev) => ({
      ...prev,
      membership: { ...prev.membership, ...data },
    }));
  }, []);

  const hydrateFromSupabaseProfile = useCallback(
    (row: SupabaseProfileRow, isCompleteOverride?: boolean) => {
      const customFields = Array.isArray(row.contact_custom_fields)
        ? row.contact_custom_fields
        : [];
      const findField = (lbl: string) =>
        customFields.find((f) => f?.label === lbl)?.value || '';

      const boundariesFromCol =
        Array.isArray(row.play_boundaries) && row.play_boundaries.length > 0
          ? row.play_boundaries
          : [];
      const boundariesRaw = findField('boundaries');
      const parsedBoundaries =
        boundariesFromCol.length > 0
          ? boundariesFromCol
          : boundariesRaw
          ? boundariesRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      const playStyleVal =
        (row.play_style as PlayStyleType) ||
        (findField('play_style') as PlayStyleType) ||
        'Play Together as a Unit';
      const partnerCodeVal = row.linked_partner_code || findField('partner_code') || '';
      const myLinkCode = row.partner_link_code || generateRandomPartnerCode();

      const interestedArr =
        Array.isArray(row.interested_in) && row.interested_in.length > 0
          ? (row.interested_in as InterestedInType[])
          : (['everyone'] as InterestedInType[]);

      const tagline = row.bio_tagline || '';
      let karaokeSong = row.karaoke_song || '';
      let favoriteTravelSpot = row.favorite_travel_spot || '';
      let hiddenSkill = row.hidden_skill || '';

      if (!karaokeSong && !favoriteTravelSpot && !hiddenSkill && tagline) {
        tagline.split('•').forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.startsWith('Karaoke:'))
            karaokeSong = trimmed.replace('Karaoke:', '').trim();
          else if (trimmed.startsWith('Travel:'))
            favoriteTravelSpot = trimmed.replace('Travel:', '').trim();
          else if (trimmed.startsWith('Skill:'))
            hiddenSkill = trimmed.replace('Skill:', '').trim();
        });
      }

      const isComplete =
        typeof isCompleteOverride === 'boolean'
          ? isCompleteOverride
          : Boolean(row.onboarding_completed);

      setProfile((prev) => ({
        ...prev,
        userId: row.id,
        identity: {
          ...prev.identity,
          displayName: row.default_display_name || row.sso_full_name || '',
          ssoFullName: row.sso_full_name || '',
          avatarUrl: row.avatar_url || '',
          homeCity: row.home_city || prev.identity.homeCity,
          whoYouAre: (row.bucket_type as WhoYouAreType) || 'single',
          gender: (row.gender as GenderType) || 'man',
          interestedIn: interestedArr,
          bioTagline: tagline,
          karaokeSong: karaokeSong || prev.identity.karaokeSong,
          favoriteTravelSpot: favoriteTravelSpot || prev.identity.favoriteTravelSpot,
          hiddenSkill: hiddenSkill || prev.identity.hiddenSkill,
        },
        partner: {
          ...prev.partner,
          linkCode: myLinkCode,
          playStyle: playStyleVal,
          enteredCode: partnerCodeVal,
          isLinked: Boolean(partnerCodeVal),
          partnerName: partnerCodeVal ? `Partner #${partnerCodeVal}` : '',
        },
        preferences: {
          lookingFor: interestedArr,
          playBoundaries:
            parsedBoundaries.length > 0 ? parsedBoundaries : prev.preferences.playBoundaries,
        },
        contactVault: {
          phone: row.contact_phone || '',
          email: row.contact_email || '',
          instagram: row.contact_instagram || '',
          clubAccount: row.contact_club_account || '',
          sls: row.contact_sls || '',
          customFields,
        },
        membership: {
          tier: (row.subscription_tier as SubscriptionTier) || 'free',
          status: (row.subscription_status as SubscriptionStatus) || 'none',
          canHostEvents: row.can_host_events ?? true,
        },
        isOnboardingCompleted: isComplete,
        swingsetOptedIn: Boolean(row.swingset_opted_in) || prev.swingsetOptedIn,
      }));
      setIsSessionLocked(false);
    },
    []
  );

  const refreshProfileFromSupabase = useCallback(async (): Promise<SupabaseProfileRow | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsLoadingProfile(false);
        return null;
      }

      const user = session.user;
      const ssoName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : '');
      const ssoAvatar =
        user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
      const ssoEmail = user.email || '';

      let { data: row } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // If no profile row exists yet or SSO fields need backfilling, upsert SSO defaults safely
      if (!row) {
        const { data: created } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              default_display_name: ssoName || 'Guest',
              sso_full_name: ssoName || null,
              contact_email: ssoEmail || null,
              avatar_url: ssoAvatar || null,
              partner_link_code: generateRandomPartnerCode(),
              onboarding_completed: false,
            },
            { onConflict: 'id' }
          )
          .select('*')
          .maybeSingle();
        row = created;
      } else if (
        (!row.sso_full_name && ssoName) ||
        (!row.contact_email && ssoEmail) ||
        (!row.avatar_url && ssoAvatar) ||
        row.default_display_name === 'Host User'
      ) {
        const { data: updated } = await supabase
          .from('profiles')
          .update({
            default_display_name:
              row.default_display_name === 'Host User' || !row.default_display_name
                ? ssoName || 'Guest'
                : row.default_display_name,
            sso_full_name: row.sso_full_name || ssoName || null,
            contact_email: row.contact_email || ssoEmail || null,
            avatar_url: row.avatar_url || ssoAvatar || null,
          })
          .eq('id', user.id)
          .select('*')
          .maybeSingle();
        if (updated) row = updated;
      }

      if (row) {
        hydrateFromSupabaseProfile(row);
      }
      setIsLoadingProfile(false);
      return row;
    } catch {
      setIsLoadingProfile(false);
      return null;
    }
  }, [hydrateFromSupabaseProfile]);

  // Automatically hydrate profile on app launch and whenever Supabase Auth session changes
  useEffect(() => {
    refreshProfileFromSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshProfileFromSupabase();
      } else {
        setProfile(createInitialProfile());
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshProfileFromSupabase]);

  const generatePartnerCode = useCallback(() => {
    const code = generateRandomPartnerCode();
    setProfile((prev) => ({
      ...prev,
      partner: { ...prev.partner, linkCode: code },
    }));
    return code;
  }, []);

  const completeOnboarding = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      isOnboardingCompleted: true,
    }));
    setIsSessionLocked(false);
  }, []);

  const acceptSwingSetGate = useCallback(async () => {
    setProfile((prev) => ({
      ...prev,
      swingsetOptedIn: true,
    }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        await supabase
          .from('profiles')
          .update({
            swingset_opted_in: true,
            swingset_accepted_at: new Date().toISOString(),
          })
          .eq('id', uid);
      }
    } catch {
      // Ignore if migration 006 hasn't been applied yet
    }
  }, []);

  const resetOnboarding = useCallback(() => {
    setProfile(createInitialProfile());
    setIsSessionLocked(false);
  }, []);

  const lockSession = useCallback(() => {
    setIsSessionLocked(true);
  }, []);

  const unlockSession = useCallback(() => {
    setIsSessionLocked(false);
  }, []);

  const loginWithCredentials = useCallback((nameOrEmail: string, pinOrCode: string): boolean => {
    if (!nameOrEmail.trim()) return false;
    if (pinOrCode.trim() === 'NASH-25' || pinOrCode.trim().length === 4) {
      setProfile((prev) => {
        if (!prev.identity.displayName) {
          return {
            ...prev,
            identity: { ...prev.identity, displayName: nameOrEmail.trim() },
          };
        }
        return prev;
      });
      setIsSessionLocked(false);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsSessionLocked(true);
  }, []);

  return (
    <UserContext.Provider
      value={{
        profile,
        isSessionLocked,
        isLoadingProfile,
        updateIdentity,
        updatePartner,
        updatePreferences,
        updateContactVault,
        updateMembership,
        hydrateFromSupabaseProfile,
        refreshProfileFromSupabase,
        generatePartnerCode,
        completeOnboarding,
        acceptSwingSetGate,
        resetOnboarding,
        lockSession,
        unlockSession,
        loginWithCredentials,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

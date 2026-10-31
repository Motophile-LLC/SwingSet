import React, { createContext, useContext, useState, useCallback } from 'react';

export type WhoYouAreType = 'Single Male' | 'Single Female' | 'Couple' | 'Group Arrival';
export type PlayStyleType = 'Play Together as a Unit' | 'Mingle Separately with Check-Ins';

export interface UserIdentity {
  displayName: string;
  whoYouAre: WhoYouAreType | '';
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

export interface UserProfile {
  identity: UserIdentity;
  partner: PartnerInfo;
  preferences: PreferencesInfo;
  isOnboardingCompleted: boolean;
}

export const generateRandomPartnerCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

interface UserContextType {
  profile: UserProfile;
  isSessionLocked: boolean;
  updateIdentity: (data: Partial<UserIdentity>) => void;
  updatePartner: (data: Partial<PartnerInfo>) => void;
  updatePreferences: (data: Partial<PreferencesInfo>) => void;
  generatePartnerCode: () => string;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  lockSession: () => void;
  unlockSession: () => void;
  loginWithCredentials: (nameOrEmail: string, pinOrCode: string) => boolean;
  logout: () => void;
}

const initialIdentity: UserIdentity = {
  displayName: 'Alex_Vibe',
  whoYouAre: 'Couple',
  karaokeSong: "Don't Stop Believin'",
  favoriteTravelSpot: 'Amalfi Coast',
  hiddenSkill: 'Espresso Martini Master',
};

const createInitialPartner = (): PartnerInfo => ({
  linkCode: generateRandomPartnerCode(),
  enteredCode: '',
  isLinked: false,
  partnerName: '',
  playStyle: 'Play Together as a Unit',
});

const initialPreferences: PreferencesInfo = {
  lookingFor: ['Couples Only', 'Non-Singles / Open Partners'],
  playBoundaries: ['Same Room', 'Soft Swap'],
};

const createInitialProfile = (): UserProfile => ({
  identity: initialIdentity,
  partner: createInitialPartner(),
  preferences: initialPreferences,
  isOnboardingCompleted: false,
});

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(createInitialProfile);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);

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

  const resetOnboarding = useCallback(() => {
    setProfile({
      identity: {
        displayName: '',
        whoYouAre: '',
        karaokeSong: '',
        favoriteTravelSpot: '',
        hiddenSkill: '',
      },
      partner: createInitialPartner(),
      preferences: {
        lookingFor: [],
        playBoundaries: [],
      },
      isOnboardingCompleted: false,
    });
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
        updateIdentity,
        updatePartner,
        updatePreferences,
        generatePartnerCode,
        completeOnboarding,
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


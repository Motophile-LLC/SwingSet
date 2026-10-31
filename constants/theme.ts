export const Colors = {
  background: {
    black: '#0D0D0D',
    darkSteel: '#1A1D20',
    card: '#15181B',
    inputBg: '#131518',
  },
  border: {
    steelGray: '#2E343B',
    brushedSteel: '#8E96A0',
  },
  accent: {
    copper: '#C86D51',
    copperHover: '#D87A5E',
    crimson: '#D9383A',
    emerald: '#2EAF7D',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#8E96A0',
    muted: '#5C6470',
    copper: '#C86D51',
  },
};

export const Typography = {
  header: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.text.primary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.text.secondary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
};

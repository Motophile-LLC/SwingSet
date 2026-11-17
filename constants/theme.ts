export const Colors = {
  background: {
    black: '#0A0A10',
    darkSteel: '#12121C',
    card: '#161622',
    inputBg: '#0E0E16',
  },
  border: {
    steelGray: '#262638',
    brushedSteel: '#5A6BFF',
  },
  accent: {
    copper: '#5A6BFF',
    copperHover: '#7B89FF',
    crimson: '#FF5C7A',
    emerald: '#34D399',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A6A6C0',
    muted: '#6C6C86',
    copper: '#8290FF',
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

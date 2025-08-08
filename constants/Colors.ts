/**
 * Professional Color Palette for PMC Admin App
 * Modern, accessible, and vibrant color scheme
 */

export const Colors = {
  // Primary Brand Colors
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main primary
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Secondary Colors
  secondary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Main secondary
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },

  // Success Colors
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Main success
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Warning Colors
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Main warning
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Error Colors
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Main error
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Neutral Colors
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    accent: '#EFF6FF',
  },

  // Text Colors
  text: {
    primary: '#0F172A',
    secondary: '#334155',
    tertiary: '#64748B',
    inverse: '#FFFFFF',
    muted: '#94A3B8',
  },

  // Border Colors
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
    dark: '#94A3B8',
  },

  // Shadow Colors
  shadow: {
    light: 'rgba(15, 23, 42, 0.04)',
    medium: 'rgba(15, 23, 42, 0.08)',
    dark: 'rgba(15, 23, 42, 0.16)',
  },

  // Status Colors for specific use cases
  status: {
    excellent: '#10B981',
    good: '#3B82F6',
    average: '#F59E0B',
    poor: '#EA580C',
    critical: '#EF4444',
    active: '#10B981',
    inactive: '#94A3B8',
    pending: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
  },

  // Gradient Colors
  gradients: {
    primary: ['#667eea', '#764ba2'],
    secondary: ['#f093fb', '#f5576c'],
    success: ['#4facfe', '#00f2fe'],
    warning: ['#ffecd2', '#fcb69f'],
    sunset: ['#ff9a9e', '#fecfef'],
    ocean: ['#a8edea', '#fed6e3'],
    purple: ['#d299c2', '#fef9d7'],
    blue: ['#89f7fe', '#66a6ff'],
  },

  // Component specific colors
  card: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    shadow: 'rgba(15, 23, 42, 0.08)',
  },

  button: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    secondary: '#F1F5F9',
    secondaryHover: '#E2E8F0',
    success: '#10B981',
    successHover: '#059669',
    warning: '#F59E0B',
    warningHover: '#D97706',
    error: '#EF4444',
    errorHover: '#DC2626',
  },

  input: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    borderFocus: '#3B82F6',
    placeholder: '#94A3B8',
  },

  // Tab bar colors
  tabBar: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    active: '#3B82F6',
    inactive: '#94A3B8',
  },

  // Theme colors for compatibility
  light: {
    text: '#0F172A',
    background: '#FFFFFF',
    tint: '#3B82F6',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#3B82F6',
  },

  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    tint: '#60A5FA',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#60A5FA',
  },
};

// Helper functions for color manipulation
export const getColorWithOpacity = (color: string, opacity: number): string => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'excellent':
    case 'active':
    case 'approved':
    case 'good':
      return Colors.status.excellent;
    case 'average':
    case 'pending':
      return Colors.status.average;
    case 'poor':
    case 'warning':
      return Colors.status.poor;
    case 'critical':
    case 'error':
    case 'rejected':
    case 'inactive':
      return Colors.status.critical;
    default:
      return Colors.neutral[500];
  }
};

export const getGradientColors = (type: keyof typeof Colors.gradients): string[] => {
  return Colors.gradients[type];
};

export default Colors;

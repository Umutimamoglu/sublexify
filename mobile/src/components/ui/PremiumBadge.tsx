import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface PremiumBadgeProps {
  style?: ViewStyle;
}

export function PremiumBadge({ style }: PremiumBadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.icon}>👑</Text>
      <Text style={styles.text}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.95)', // Amber 500
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    fontSize: 10,
  },
  text: {
    color: 'white',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
  },
});

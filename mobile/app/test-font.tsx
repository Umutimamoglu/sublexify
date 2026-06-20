import { View, Text as RNText } from 'react-native';

export default function TestFont() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RNText style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30 }}>
        PLUS JAKARTA EXTRA BOLD
      </RNText>
      <RNText style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 30 }}>
        PLUS JAKARTA REGULAR
      </RNText>
      <RNText style={{ fontSize: 30, fontWeight: '800' }}>
        SYSTEM EXTRA BOLD
      </RNText>
    </View>
  );
}

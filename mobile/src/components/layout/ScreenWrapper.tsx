import { ScrollView, KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '@/src/hooks/useResponsive';

type ScreenWrapperProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  contentStyle?: ViewStyle;
};

export function ScreenWrapper({
  children,
  scrollable = true,
  className,
  contentStyle,
}: ScreenWrapperProps) {
  const { isTablet } = useResponsive();

  return (
    <SafeAreaView className={`flex-1 bg-gray-50 dark:bg-gray-900 ${className ?? ''}`}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={[
              isTablet ? { paddingHorizontal: 32, alignSelf: 'center', width: '100%', maxWidth: 800 } : undefined,
              contentStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

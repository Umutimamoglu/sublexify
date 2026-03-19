import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'İzleyerek Öğren',
    description: 'Favori film ve dizilerindeki cümleleri keşfet. Gerçek hayatta nasıl konuşulduğunu doğal bağlamında gör.',
    icon: 'film-outline' as const,
    color: '#6366f1', // indigo-500
  },
  {
    id: '2',
    title: 'Yapay Zeka Sözlüğü',
    description: 'Sadece Türkçe karşılığı değil. Cümlenin içindeki mecazları, deyimleri ve kullanım şekillerini yapay zeka ile analiz et.',
    icon: 'bulb-outline' as const,
    color: '#8b5cf6', // violet-500
  },
  {
    id: '3',
    title: 'Akıllı Kelime Havuzu',
    description: 'Binlerce kelime arasından kendi seviyene (A1-C2) uygun olanları filtrele. Sadece bilmediklerine odaklan.',
    icon: 'layers-outline' as const,
    color: '#0ea5e9', // sky-500
  },
  {
    id: '4',
    title: 'Kalıcı Hafıza',
    description: 'Öğrendiğin kelimeleri aralıklı tekrar (Spaced Repetition) yöntemiyle tam zamanında tekrar ederek asla unutma.',
    icon: 'trending-up-outline' as const,
    color: '#10b981', // emerald-500
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { setHasSeenOnboarding, isAuthenticated } = useAuthStore();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setHasSeenOnboarding(true);
    
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else {
      // If came from profile (can go back), go back. Otherwise go to tabs.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/discover');
      }
    }
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    return (
      <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: `${item.color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
          <Ionicons name={item.icon} size={64} color={item.color} />
        </View>
        <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
          {item.title}
        </Text>
        <Text className="text-lg text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          {item.description}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0f1117]">
      {/* Skip Button */}
      <View className="flex-row justify-end px-6 pt-4">
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleFinish}>
            <Text className="text-gray-500 dark:text-gray-400 font-medium text-base">Atla</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Bottom Section */}
      <View className="px-6 pb-10 pt-4">
        {/* Pagination Dots */}
        <View className="flex-row justify-center space-x-2 mb-8 gap-2">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={{
                height: 8,
                width: currentIndex === index ? 24 : 8,
                borderRadius: 4,
                backgroundColor: currentIndex === index ? SLIDES[currentIndex].color : '#4b5563',
              }}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          className="w-full py-4 rounded-2xl items-center justify-center shadow-lg"
          style={{ backgroundColor: SLIDES[currentIndex].color, shadowColor: SLIDES[currentIndex].color, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
        >
          <Text className="text-white font-bold text-lg">
            {currentIndex === SLIDES.length - 1 
              ? (isAuthenticated ? 'Anladım' : 'Hemen Başla') 
              : 'Devam Et'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

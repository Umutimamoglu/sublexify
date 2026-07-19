import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ListScreen from '@/src/components/screens/ListScreen';

type CategoryType = 'learnt' | 'studied' | 'due' | 'difficult' | 'notes';

export default function CategoryDetailScreen() {
  const { category } = useLocalSearchParams<{ category: CategoryType }>();
  
  return <ListScreen category={category} />;
}

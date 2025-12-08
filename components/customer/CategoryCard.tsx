import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/styles/appTheme';

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

export default function CategoryCard({ category, onPress }: CategoryCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
      <Text style={styles.categoryEmoji}>{category.emoji}</Text>
      <Text style={styles.categoryName}>{category.name}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    categoryCard: {
      alignItems: 'center',
      marginRight: 16,
      backgroundColor: theme.colors.surface,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      ...theme.shadows.card,
    },
    categoryEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    categoryName: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
    },
  });

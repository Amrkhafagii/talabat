import { useState } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (itemId: number) => {
    setFavorites(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isFavorite = (itemId: number) => {
    return favorites.includes(itemId);
  };

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}
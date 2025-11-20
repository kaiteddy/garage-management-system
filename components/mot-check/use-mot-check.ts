import { useState, useEffect } from 'react';
import { MOTCheckResult, SearchHistoryItem, FavoriteVehicle } from './types';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export const useMOTCheck = () => {
  const [registration, setRegistration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MOTCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteVehicle[]>([]);
  const [activeTab, setActiveTab] = useState('details');

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('motCheckHistory');
      const savedFavorites = localStorage.getItem('motCheckFavorites');
      
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }
      
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.error('Failed to load saved data:', e);
    }
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('motCheckHistory', JSON.stringify(searchHistory));
    } catch (e) {
      console.error('Failed to save search history:', e);
    }
  }, [searchHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('motCheckFavorites', JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }, [favorites]);

  const checkMOT = async (reg: string) => {
    if (!reg.trim()) {
      setError('Please enter a registration number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mot-check?registration=${encodeURIComponent(reg.trim().toUpperCase())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to check MOT status');
      }

      const motResult: MOTCheckResult = {
        ...data,
        // Ensure we have an array of tests, even if empty
        motTests: Array.isArray(data.motTests) ? data.motTests : [],
      };

      setResult(motResult);
      
      // Add to search history
      addToHistory(reg, motResult);
      
      toast.success('MOT check completed successfully');
      return motResult;
    } catch (err) {
      console.error('MOT check failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to check MOT status';
      setError(errorMessage);
      toast.error('MOT check failed', { description: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (reg: string, data?: MOTCheckResult) => {
    const newItem: SearchHistoryItem = {
      registration: reg,
      date: new Date().toISOString(),
      data
    };

    setSearchHistory(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item.registration !== reg);
      // Add to beginning of array
      return [newItem, ...filtered].slice(0, 10); // Keep last 10 searches
    });
  };

  const addToFavorites = (vehicle: Omit<FavoriteVehicle, 'id' | 'addedAt'>) => {
    const newFavorite: FavoriteVehicle = {
      ...vehicle,
      id: `fav_${Date.now()}`,
      addedAt: new Date().toISOString(),
    };

    setFavorites(prev => {
      // Check if already in favorites
      const exists = prev.some(fav => fav.registration === vehicle.registration);
      if (exists) {
        toast.info('Vehicle already in favorites');
        return prev;
      }
      toast.success('Added to favorites');
      return [...prev, newFavorite];
    });
  };

  const removeFromFavorites = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
    toast.success('Removed from favorites');
  };

  const clearHistory = () => {
    setSearchHistory([]);
    toast.success('Search history cleared');
  };

  const isFavorite = (registration: string): boolean => {
    return favorites.some(fav => fav.registration === registration);
  };

  const toggleFavorite = (vehicle: MOTCheckResult) => {
    if (isFavorite(vehicle.registration)) {
      const fav = favorites.find(f => f.registration === vehicle.registration);
      if (fav) {
        removeFromFavorites(fav.id);
      }
    } else {
      addToFavorites({
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        yearOfManufacture: vehicle.yearOfManufacture,
      });
    }
  };

  return {
    registration,
    setRegistration,
    loading,
    result,
    error,
    searchHistory,
    favorites,
    activeTab,
    setActiveTab,
    checkMOT,
    addToHistory,
    addToFavorites,
    removeFromFavorites,
    clearHistory,
    isFavorite,
    toggleFavorite,
  };
};

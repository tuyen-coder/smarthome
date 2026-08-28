import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from '@/src/services/api';
import type { Home } from '@/src/types/domain';

interface HomeContextData {
  homes: Home[];
  activeHome: Home | null;
  activeHomeRole: string | null;
  setActiveHome: (home: Home) => Promise<void>;
  refreshHomes: () => Promise<void>;
  isLoading: boolean;
}

const HomeContext = createContext<HomeContextData>({} as HomeContextData);

const ACTIVE_HOME_KEY = 'active_home_id';

async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return await SecureStore.getItemAsync(key);
}

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [activeHome, setActiveHomeState] = useState<Home | null>(null);
  const [activeHomeRole, setActiveHomeRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHomes = async () => {
    try {
      const fetchedHomes = await api.homes();
      setHomes(fetchedHomes);

      // Thử lấy activeHomeId từ bộ nhớ
      const savedId = await getStorageItem(ACTIVE_HOME_KEY);
      let matchedHome = null;
      
      if (savedId) {
        matchedHome = fetchedHomes.find(h => h.id.toString() === savedId);
      }
      
      // Nếu không tìm thấy nhà lưu hoặc chưa có, chọn nhà đầu tiên làm mặc định
      if (!matchedHome && fetchedHomes.length > 0) {
        matchedHome = fetchedHomes[0];
        await setStorageItem(ACTIVE_HOME_KEY, matchedHome.id.toString());
      }
      
      if (matchedHome) {
        try {
          const roleData = await api.myRole(matchedHome.id);
          setActiveHomeRole(roleData.role);
        } catch (e) {
          console.error('[HomeProvider] Failed to fetch role', e);
        }
      }
      
      setActiveHomeState(matchedHome || null);
    } catch (err) {
      console.error('[HomeProvider] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomes();
  }, []);

  const setActiveHome = async (home: Home) => {
    setActiveHomeState(home);
    await setStorageItem(ACTIVE_HOME_KEY, home.id.toString());
    try {
      const roleData = await api.myRole(home.id);
      setActiveHomeRole(roleData.role);
    } catch (e) {
      console.error('[HomeProvider] Failed to fetch role', e);
    }
  };

  return (
    <HomeContext.Provider
      value={{
        homes,
        activeHome,
        activeHomeRole,
        setActiveHome,
        refreshHomes: fetchHomes,
        isLoading,
      }}>
      {children}
    </HomeContext.Provider>
  );
}

export const useHome = () => useContext(HomeContext);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DataState {
  uploadedData: any | null;
  setUploadedData: (data: any) => void;
  clearData: () => void;
  getFullData: () => any[] | null;
  fetchFullDataFromRedis: (userId: string, datasetId: string) => Promise<any[] | null>;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      uploadedData: null,
      setUploadedData: (data) => {
        set({ uploadedData: data });
        // ALWAYS store fullData in sessionStorage when data is uploaded
        if (data?.preview?.fullData && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('__fullDataCache', JSON.stringify(data.preview.fullData));
            console.log('[useDataStore] Stored fullData in sessionStorage:', data.preview.fullData.length, 'rows');
          } catch (e) {
            console.warn('[useDataStore] Failed to store fullData in sessionStorage, using memory fallback:', e);
            (window as any).__fullDataCache = data.preview.fullData;
          }
        }
      },
      clearData: () => {
        set({ uploadedData: null });
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('__fullDataCache');
          delete (window as any).__fullDataCache;
        }
      },
      getFullData: () => {
        const state = get();

        // First try to get from state
        if (state.uploadedData?.preview?.fullData) {
          return state.uploadedData.preview.fullData;
        }

        // Then try sessionStorage (persistent across page refreshes)
        if (typeof window !== 'undefined') {
          try {
            const cached = sessionStorage.getItem('__fullDataCache');
            if (cached) {
              const parsedData = JSON.parse(cached);
              console.log('[useDataStore] Restored fullData from sessionStorage:', parsedData.length, 'rows');
              return parsedData;
            }
          } catch (e) {
            console.warn('[useDataStore] Failed to parse fullData from sessionStorage:', e);
          }

          // Try memory cache as last resort
          if ((window as any).__fullDataCache) {
            return (window as any).__fullDataCache;
          }
        }

        // Fallback to sampleRows (only if nothing else available)
        console.warn('[useDataStore] Using sampleRows fallback - fullData not available');
        console.warn('[useDataStore] TIP: Use fetchFullDataFromRedis() to load full dataset from cache');
        return state.uploadedData?.preview?.sampleRows || null;
      },
      fetchFullDataFromRedis: async (userId: string, datasetId: string) => {
        try {
          console.log('[useDataStore] Fetching full dataset from Redis API...');

          const response = await fetch(`/api/dataset/${datasetId}?userId=${userId}`);

          if (!response.ok) {
            console.error('[useDataStore] Failed to fetch from Redis API:', response.statusText);
            return null;
          }

          const result = await response.json();

          if (result.success && result.data?.rows) {
            console.log(`[useDataStore] ✅ Fetched ${result.data.rows.length} rows from ${result.source}`);

            // Store in sessionStorage for future use
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('__fullDataCache', JSON.stringify(result.data.rows));
                console.log('[useDataStore] Cached full data in sessionStorage');
              } catch (e) {
                console.warn('[useDataStore] Failed to cache in sessionStorage:', e);
                (window as any).__fullDataCache = result.data.rows;
              }
            }

            // Update the store with full data
            const state = get();
            if (state.uploadedData?.preview) {
              set({
                uploadedData: {
                  ...state.uploadedData,
                  preview: {
                    ...state.uploadedData.preview,
                    fullData: result.data.rows,
                    columns: result.data.columns,
                    types: result.data.types,
                    rowCount: result.data.rowCount,
                    columnCount: result.data.columnCount,
                  },
                },
              });
            }

            return result.data.rows;
          }

          console.warn('[useDataStore] No data returned from Redis API');
          return null;
        } catch (error) {
          console.error('[useDataStore] Error fetching from Redis API:', error);
          return null;
        }
      },
    }),
    {
      name: 'insightflow-data',
      // Store metadata in sessionStorage, fullData stored separately
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);

          // Restore fullData from sessionStorage cache if available
          if (parsed.state?.uploadedData?.preview && typeof window !== 'undefined') {
            try {
              const cached = sessionStorage.getItem('__fullDataCache');
              if (cached) {
                parsed.state.uploadedData.preview.fullData = JSON.parse(cached);
                console.log('[useDataStore] Restored fullData on load:', parsed.state.uploadedData.preview.fullData.length, 'rows');
              }
            } catch (e) {
              console.warn('[useDataStore] Failed to restore fullData:', e);
            }
          }

          return parsed;
        },
        setItem: (name, value) => {
          // Store full data separately to avoid size limits on main storage
          const dataToStore = JSON.parse(JSON.stringify(value)); // Deep clone

          // Remove fullData from main storage (stored separately in __fullDataCache)
          if (dataToStore.state?.uploadedData?.preview?.fullData) {
            // Already stored in setUploadedData, just remove from main storage
            dataToStore.state.uploadedData.preview.fullData = null;
          }

          sessionStorage.setItem(name, JSON.stringify(dataToStore));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
          sessionStorage.removeItem('__fullDataCache');
          if (typeof window !== 'undefined') {
            delete (window as any).__fullDataCache;
          }
        },
      },
    }
  )
);

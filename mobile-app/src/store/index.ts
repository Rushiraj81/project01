import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import reducers
import authReducer from './slices/authSlice';
import healthReducer from './slices/healthSlice';
import alertsReducer from './slices/alertsSlice';
import caregiverReducer from './slices/caregiverSlice';
import settingsReducer from './slices/settingsSlice';
import syncReducer from './slices/syncSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'health', 'alerts', 'caregiver', 'settings'], // Only persist these reducers
  blacklist: ['sync'], // Don't persist sync state
};

const rootReducer = combineReducers({
  auth: authReducer,
  health: healthReducer,
  alerts: alertsReducer,
  caregiver: caregiverReducer,
  settings: settingsReducer,
  sync: syncReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
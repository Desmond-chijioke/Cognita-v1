// src/Redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectReducer from './slices/projectSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';
import hodReducer from './slices/hodSlice';
import usersReducer from './slices/usersSlice';
import submissionsReducer from './slices/submissionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    ui: uiReducer,
    notifications: notificationReducer,
    hod: hodReducer,
    users: usersReducer,
    submissions: submissionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

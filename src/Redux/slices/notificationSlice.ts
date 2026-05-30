import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
  link?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
}

const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: 'n-1', title: 'Chapter 3 Approved', message: 'Your supervisor has approved Chapter 3: Methodology.', type: 'success', read: false, timestamp: '2026-05-22T09:00:00Z' },
  { id: 'n-2', title: 'Review Comment Added', message: 'Prof. Nwosu left a comment on Chapter 2: Literature Review.', type: 'info', read: false, timestamp: '2026-05-21T14:30:00Z' },
  { id: 'n-3', title: 'Submission Deadline Reminder', message: 'Your thesis draft is due in 14 days.', type: 'warning', read: false, timestamp: '2026-05-20T08:00:00Z' },
  { id: 'n-4', title: 'AI Review Complete', message: 'Automated review of Chapter 4 is ready to view.', type: 'info', read: true, timestamp: '2026-05-19T16:45:00Z' },
];

const initialState: NotificationState = {
  notifications: DEMO_NOTIFICATIONS,
  unreadCount: DEMO_NOTIFICATIONS.filter(n => !n.read).length,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Omit<AppNotification, 'id' | 'read' | 'timestamp'>>) {
      const notification: AppNotification = {
        ...action.payload,
        id: `n-${Date.now()}`,
        read: false,
        timestamp: new Date().toISOString(),
      };
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },
    markAsRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find(n => n.id === action.payload);
      if (n && !n.read) {
        n.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead(state) {
      state.notifications.forEach(n => (n.read = true));
      state.unreadCount = 0;
    },
    clearNotification(state, action: PayloadAction<string>) {
      const idx = state.notifications.findIndex(n => n.id === action.payload);
      if (idx !== -1) {
        if (!state.notifications[idx].read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(idx, 1);
      }
    },
  },
});

export const { addNotification, markAsRead, markAllAsRead, clearNotification } = notificationSlice.actions;
export default notificationSlice.reducer;

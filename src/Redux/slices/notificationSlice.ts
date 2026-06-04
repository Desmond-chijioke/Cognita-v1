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
  { id: 'sn-1',  title: 'New Chapter Submitted',        message: 'Amara Osei submitted Chapter 3 — Methodology for your review.',                                           type: 'info',    read: false, timestamp: '2026-06-03T08:30:00Z' },
  { id: 'sn-2',  title: 'Compliance Flag — Critical',   message: "Emeka Okafor's project has been flagged. AI detection score: 41%, Similarity: 34%. Immediate review needed.", type: 'error',   read: false, timestamp: '2026-06-03T07:15:00Z' },
  { id: 'sn-3',  title: 'New Approval Request',         message: 'Kofi Mensah submitted a Topic Change Request awaiting your approval.',                                       type: 'warning', read: false, timestamp: '2026-06-02T15:00:00Z' },
  { id: 'sn-4',  title: 'Literature Review Submitted',  message: 'Kofi Mensah submitted a Literature Review Update for review.',                                               type: 'info',    read: true,  timestamp: '2026-06-02T09:45:00Z' },
  { id: 'sn-5',  title: 'Compliance Warning',           message: "Taiwo Bakare's AI detection score reached 32%, approaching the institution's 35% threshold.",                type: 'warning', read: true,  timestamp: '2026-06-01T14:00:00Z' },
  { id: 'sn-6',  title: 'Review Overdue',               message: "Emeka Okafor's Research Proposal has been waiting for your review for 4 days.",                             type: 'warning', read: true,  timestamp: '2026-05-31T10:00:00Z' },
  { id: 'sn-7',  title: 'Submission Approval Requested', message: 'Fatima Al-Rashid has requested final thesis submission approval.',                                          type: 'info',    read: true,  timestamp: '2026-05-30T11:30:00Z' },
  { id: 'sn-8',  title: 'Chapter Revision Resubmitted', message: 'Taiwo Bakare resubmitted Chapter 3 following your revision request.',                                       type: 'success', read: true,  timestamp: '2026-05-28T16:00:00Z' },
  { id: 'sn-9',  title: 'Weekly Integrity Report',      message: 'Your department integrity report for 26 May – 1 Jun 2026 is now available.',                                type: 'info',    read: true,  timestamp: '2026-05-27T09:00:00Z' },
  { id: 'sn-10', title: 'Platform Maintenance',         message: 'CognitaAI undergoes scheduled maintenance on 1 Jun from 02:00–04:00 WAT.',                                  type: 'info',    read: true,  timestamp: '2026-05-26T08:00:00Z' },
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

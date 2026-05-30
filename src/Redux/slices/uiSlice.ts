import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  activeModule: string;
  colorScheme: 'light' | 'dark';
}

const initialState: UIState = {
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  activeModule: 'dashboard',
  colorScheme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleMobileSidebar(state) {
      state.sidebarMobileOpen = !state.sidebarMobileOpen;
    },
    setMobileSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarMobileOpen = action.payload;
    },
    setActiveModule(state, action: PayloadAction<string>) {
      state.activeModule = action.payload;
    },
    toggleColorScheme(state) {
      state.colorScheme = state.colorScheme === 'light' ? 'dark' : 'light';
    },
    setColorScheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.colorScheme = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleMobileSidebar,
  setMobileSidebarOpen,
  setActiveModule,
  toggleColorScheme,
  setColorScheme,
} = uiSlice.actions;
export default uiSlice.reducer;

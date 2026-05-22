/**
 * @file AppState.ts
 * @description Estado interno do AppController e configurações.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

export interface AppState {
  currentPeriod: string;
  isLoading: boolean;
  retryCount: number;
}

export const DEFAULT_APP_STATE: AppState = {
  currentPeriod: '',
  isLoading: false,
  retryCount: 0,
};
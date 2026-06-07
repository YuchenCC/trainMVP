// ========== 导览模块导出 ==========
export { TourProvider } from './TourProvider';
export { WelcomeModal } from './WelcomeModal';
export { TourHelpButton } from './TourHelpButton';
export { useTourStore } from './store';
export {
  generalTour,
  baTour,
  pmTour,
  trainAdminTour,
  getTourConfigByRole,
  getRoleSpecificTour,
} from './config';
export type { TourConfig, TourStep, CompletedTours } from './config';
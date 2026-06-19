import React from 'react';
import { PageWrapper } from '../shared/components/PageWrapper';

// A helper to quickly create dummy pages
const createPage = (title: string, description: string) => {
  return () => (
    <PageWrapper className="items-center justify-center text-center">
      <h2 className="text-3xl font-bold tracking-tight mb-2 text-primary">{title}</h2>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
    </PageWrapper>
  );
};

export { HomePage } from '../features/home/pages/HomePage';
export const LandingPage = createPage('Welcome to Tulete', 'The ultimate service hub.');
export const LoginPage = createPage('Sign In', 'Welcome back.');
export const RegisterPage = createPage('Create Account', 'Join Tulete today.');
export const DashboardPage = createPage('Dashboard', 'Your personal hub.');

// Real feature-module implementations
export { CartPage } from '../features/cart/pages/CartPage';
export { CheckoutPage } from '../features/cart/pages/CheckoutPage';
export { OrdersPage } from '../features/orders/pages/OrdersPage';
export { OrderTrackingPage } from '../features/tracking/pages/OrderTrackingPage';
export { StoreListingPage } from '../features/stores/pages/StoreListingPage';
export { StoreDetailsPage } from '../features/stores/pages/StoreDetailsPage';
export { ConversationsPage as MessagesPage } from '../features/messages/pages/ConversationsPage';
export { ChatScreen as ChatScreenPage } from '../features/messages/pages/ChatScreen';
export { FavoritesPage } from '../features/favorites/pages/FavoritesPage';
export { ReviewsPage } from '../features/reviews/pages/ReviewsPage';
export { LocationPage } from '../features/location/pages/LocationPage';
export { ProfilePage } from '../features/users/pages/ProfilePage';
export { SettingsPage } from '../features/users/pages/SettingsPage';
export { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
export const BrandDetailsPage = createPage('Brand Details', 'View brand specific products.');
export { NotFoundPage } from './NotFoundPage';

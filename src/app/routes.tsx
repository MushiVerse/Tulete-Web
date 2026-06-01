import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoadingScreen } from '../shared/components/LoadingScreen';

// Layouts
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { AuthGuard } from '../shared/components/AuthGuard';

// Pages (using lazy loading for code splitting)
const Pages = React.lazy(() => import('../pages').then(module => ({
  default: () => (
    <Suspense fallback={<LoadingScreen />}>
      {/* We can route to specific properties using a wrapper, but for simplicity here we just import directly in standard apps. 
          To make this lazy loaded file work with named exports cleanly: */}
      <div />
    </Suspense>
  )
})));

// Standard Lazy Imports (Best Practice)
const Landing = React.lazy(() => import('../pages').then(m => ({ default: m.LandingPage })));
const Login = React.lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const Register = React.lazy(() => import('../pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPassword = React.lazy(() => import('../pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const Dashboard = React.lazy(() => import('../features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const Discovery = React.lazy(() => import('../features/discovery/pages/DiscoveryPage').then(m => ({ default: m.DiscoveryPage })));
const ProductDetail = React.lazy(() => import('../features/products/pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const Orders = React.lazy(() => import('../pages').then(m => ({ default: m.OrdersPage })));
const Cart = React.lazy(() => import('../pages').then(m => ({ default: m.CartPage })));
const Favorites = React.lazy(() => import('../pages').then(m => ({ default: m.FavoritesPage })));
const Messages = React.lazy(() => import('../pages').then(m => ({ default: m.MessagesPage })));
const Profile = React.lazy(() => import('../pages').then(m => ({ default: m.ProfilePage })));
const Settings = React.lazy(() => import('../pages').then(m => ({ default: m.SettingsPage })));
const StoreDetails = React.lazy(() => import('../pages').then(m => ({ default: m.StoreDetailsPage })));
const Checkout = React.lazy(() => import('../pages').then(m => ({ default: m.CheckoutPage })));
const OrderTracking = React.lazy(() => import('../pages').then(m => ({ default: m.OrderTrackingPage })));
const StoreListing = React.lazy(() => import('../pages').then(m => ({ default: m.StoreListingPage })));
const ChatScreen = React.lazy(() => import('../pages').then(m => ({ default: m.ChatScreenPage })));
const Reviews = React.lazy(() => import('../pages').then(m => ({ default: m.ReviewsPage })));
const Location = React.lazy(() => import('../pages').then(m => ({ default: m.LocationPage })));
const Notifications = React.lazy(() => import('../pages').then(m => ({ default: m.NotificationsPage })));

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: withSuspense(Landing) },
      { path: 'store/:id', element: withSuspense(StoreDetails) },
      { path: 'product/:id', element: withSuspense(ProductDetail) },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: withSuspense(Login) },
      { path: 'register', element: withSuspense(Register) },
      { path: 'forgot-password', element: withSuspense(ForgotPassword) },
    ],
  },
  {
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      { path: 'dashboard', element: withSuspense(Dashboard) },
      { path: 'discover', element: withSuspense(Discovery) },
      { path: 'explore', element: withSuspense(StoreListing) },
      { path: 'stores', element: withSuspense(StoreListing) },
      { path: 'orders', element: withSuspense(Orders) },
      { path: 'cart', element: withSuspense(Cart) },
      { path: 'favorites', element: withSuspense(Favorites) },
      { path: 'messages', element: withSuspense(Messages) },
      { path: 'messages/chat/:id', element: withSuspense(ChatScreen) },
      { path: 'reviews', element: withSuspense(Reviews) },
      { path: 'location', element: withSuspense(Location) },
      { path: 'notifications', element: withSuspense(Notifications) },
      { path: 'profile', element: withSuspense(Profile) },
      { path: 'settings', element: withSuspense(Settings) },
      { path: 'checkout', element: withSuspense(Checkout) },
      { path: 'tracking/:id', element: withSuspense(OrderTracking) },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

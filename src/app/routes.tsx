import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoadingScreen } from '../shared/components/LoadingScreen';
import { HomeSkeleton } from '../shared/components/skeletons/HomeSkeleton';
import { GridSkeleton } from '../shared/components/skeletons/GridSkeleton';
import { ProfileSkeleton } from '../shared/components/skeletons/ProfileSkeleton';
import { OrderTrackingSkeleton } from '../features/tracking/pages/OrderTrackingPage';

// Layouts
import { RootLayout } from '../layouts/RootLayout';
import { MainLayout } from '../layouts/MainLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { DynamicShellLayout } from '../layouts/DynamicShellLayout';
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
const Home = React.lazy(() => import('../pages').then(m => ({ default: m.HomePage })));
const Landing = React.lazy(() => import('../pages').then(m => ({ default: m.LandingPage })));

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
const Laundry = React.lazy(() => import('../features/laundry/pages/LaundryPage').then(m => ({ default: m.LaundryPage })));
const Food = React.lazy(() => import('../features/food/pages/FoodPage').then(m => ({ default: m.FoodPage })));
const Products = React.lazy(() => import('../features/products/pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const BrandDetails = React.lazy(() => import('../pages').then(m => ({ default: m.BrandDetailsPage })));
const HelpCenter = React.lazy(() => import('../pages').then(m => ({ default: m.HelpCenterPage })));
const SafetyInfo = React.lazy(() => import('../pages').then(m => ({ default: m.SafetyInfoPage })));
const Cancellation = React.lazy(() => import('../pages').then(m => ({ default: m.CancellationPage })));
const Contact = React.lazy(() => import('../pages').then(m => ({ default: m.ContactPage })));
const NotFound = React.lazy(() => import('../pages').then(m => ({ default: m.NotFoundPage })));

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: withSuspense(NotFound),
    children: [
      {
        path: '/',
        element: <DynamicShellLayout />,
        children: [
          { index: true, element: <Suspense fallback={<HomeSkeleton />}><Home /></Suspense> },
          { path: 'explore', element: <Suspense fallback={<GridSkeleton />}><Discovery /></Suspense> },
          { path: 'stores', element: <Suspense fallback={<GridSkeleton />}><StoreListing /></Suspense> },
          { path: 'providers', element: <Suspense fallback={<GridSkeleton />}><StoreListing /></Suspense> },
          { path: 'shops', element: <Suspense fallback={<GridSkeleton />}><StoreListing /></Suspense> },
          { path: 'laundry', element: <Suspense fallback={<GridSkeleton />}><Laundry /></Suspense> },
          { path: 'food', element: <Suspense fallback={<GridSkeleton />}><Food /></Suspense> },
          { path: 'products', element: <Suspense fallback={<GridSkeleton />}><Products /></Suspense> },
          { path: 'help', element: withSuspense(HelpCenter) },
          { path: 'safety', element: withSuspense(SafetyInfo) },
          { path: 'cancellation', element: withSuspense(Cancellation) },
          { path: 'contact', element: withSuspense(Contact) },
          { path: 'brand/:brandName', element: withSuspense(BrandDetails) },
          { path: 'store/:id', element: withSuspense(StoreDetails) },
          { path: 'product/:id', element: withSuspense(ProductDetail) },
        ],
      },
      {
        element: <PublicLayout />,
        children: [
          { path: 'login', element: withSuspense(Landing) },
          { path: 'register', element: withSuspense(Landing) },
        ],
      },
      {
        element: (
          <AuthGuard allowedRoles={['user']}>
            <MainLayout />
          </AuthGuard>
        ),
        children: [
          { path: 'orders', element: withSuspense(Orders) },
          { path: 'cart', element: withSuspense(Cart) },
          { path: 'favorites', element: <Suspense fallback={<GridSkeleton />}><Favorites /></Suspense> },
          { path: 'messages', element: withSuspense(Messages) },
          { path: 'messages/chat/:id', element: withSuspense(ChatScreen) },
          { path: 'reviews', element: withSuspense(Reviews) },
          { path: 'location', element: withSuspense(Location) },
          { path: 'notifications', element: withSuspense(Notifications) },
          { path: 'profile', element: <Suspense fallback={<ProfileSkeleton />}><Profile /></Suspense> },
          { path: 'settings', element: <Suspense fallback={<ProfileSkeleton />}><Settings /></Suspense> },
          { path: 'checkout', element: withSuspense(Checkout) },
          { path: 'tracking/:id', element: <Suspense fallback={<OrderTrackingSkeleton />}><OrderTracking /></Suspense> },
        ],
      },
      {
        path: '*',
        element: withSuspense(NotFound),
      },
    ]
  }
]);

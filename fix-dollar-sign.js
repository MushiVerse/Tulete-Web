const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/features/tracking/pages/OrderTrackingPage.tsx',
  'src/features/laundry/pages/LaundryPage.tsx',
  'src/features/favorites/pages/FavoritesPage.tsx',
  'src/features/users/pages/SettingsPage.tsx',
  'src/features/users/pages/ProfilePage.tsx',
  'src/features/home/pages/HomePage.tsx',
  'src/features/users/services/userService.ts',
  'src/features/orders/pages/OrdersPage.tsx',
  'src/features/notifications/services/notificationService.ts',
  'src/features/cart/pages/CartPage.tsx',
  'src/features/cart/pages/CheckoutPage.tsx',
  'src/features/cart/store/useCartStore.ts',
  'src/features/food/pages/FoodPage.tsx',
  'src/features/stores/services/storeService.ts',
  'src/features/location/components/InteractiveMap.tsx',
  'src/features/stores/pages/StoreDetailsPage.tsx',
  'src/features/products/pages/ProductDetailPage.tsx',
  'src/features/products/pages/ProductsPage.tsx',
  'src/shared/components/Footer.tsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Remove literal `$` that precede `{APP_SETTINGS.currency}` in JSX
  content = content.replace(/\$\{APP_SETTINGS\.currency\}/g, '{APP_SETTINGS.currency}');
  
  // Wait, if it's inside a template string: `${APP_SETTINGS.currency}` it needs the $ !
  // Let's distinguish between JSX text and JS template string.
  // In JSX text: >${APP_SETTINGS.currency} -> >{APP_SETTINGS.currency}
  // Or space:   ${APP_SETTINGS.currency} ->  {APP_SETTINGS.currency} (when not in backticks)
  // Or: >\$\{APP_SETTINGS\.currency\} -> >{APP_SETTINGS.currency} (if escaped)
});

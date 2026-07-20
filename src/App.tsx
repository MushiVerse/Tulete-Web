import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/routes';
import { OfflineNotifier } from './shared/components/OfflineNotifier';

import { useCartStore } from './features/cart/store/useCartStore';

function App() {
  React.useEffect(() => {
    useCartStore.getState().fetchLaundryRatios();
  }, []);

  return (
    <>
      <OfflineNotifier />
      <RouterProvider router={router} />
    </>
  );
}

export default App;

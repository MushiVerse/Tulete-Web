import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/routes';
import { OfflineNotifier } from './shared/components/OfflineNotifier';

function App() {
  return (
    <>
      <OfflineNotifier />
      <RouterProvider router={router} />
    </>
  );
}

export default App;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/figtree';
import '@fontsource-variable/fraunces';
import './index.css';
import { App } from './App.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { CartProvider } from './lib/cart.jsx';
import { LocationProvider } from './lib/location.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { initNativeShell } from './lib/native.js';

initNativeShell();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <LocationProvider>
              <App />
            </LocationProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);

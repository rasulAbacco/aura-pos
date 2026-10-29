import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { ToastProvider } from '../contexts/ToastContext.jsx';

/** Everything that wraps the whole app: routing → signed-in session → toast notifications. */
export function Providers({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

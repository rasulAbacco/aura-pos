/** Sign-in, sign-up and account recovery screens (no app shell). */
import { Route } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import ForgotPasswordPage from './ForgotPasswordPage.jsx';
import ResetPasswordPage from './ResetPasswordPage.jsx';
import VerifyEmailPage from './VerifyEmailPage.jsx';
import AcceptInvitePage from './AcceptInvitePage.jsx';

export const authRoutes = (
  <>
    <Route path="login" element={<LoginPage />} />
    <Route path="register" element={<RegisterPage />} />
    <Route path="forgot-password" element={<ForgotPasswordPage />} />
    <Route path="reset-password" element={<ResetPasswordPage />} />
    <Route path="verify-email" element={<VerifyEmailPage />} />
    <Route path="accept-invite" element={<AcceptInvitePage />} />
  </>
);

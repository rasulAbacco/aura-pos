import { SetPasswordForm } from './components/SetPasswordForm.jsx';

export default function ResetPasswordPage() {
  return <SetPasswordForm title="Choose a new password" endpoint="/auth/reset-password" button="Save new password" />;
}

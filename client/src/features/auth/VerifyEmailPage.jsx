import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { AuthLayout } from './components/AuthLayout.jsx';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { reload, status } = useAuth();
  const [state, setState] = useState('working');
  useEffect(() => {
    api.post('/auth/verify-email', { token: params.get('token') })
      .then(() => { setState('ok'); if (status === 'authed') reload(); })
      .catch((e) => setState(errorMessage(e)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <AuthLayout title="Email verification">
      {state === 'working' ? <p className="text-sm">Checking your link…</p>
        : state === 'ok' ? <p className="text-sm">Your email is verified. <Link to="/app" className="font-semibold text-rose-700">Continue</Link></p>
        : <p role="alert" className="text-sm text-rose-800">{state} You can request a new link from the Subscription page.</p>}
    </AuthLayout>
  );
}

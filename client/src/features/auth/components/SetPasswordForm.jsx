import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../../../lib/api.js";
import { useAuth } from "../../../hooks/useAuth.js";
import { AuthLayout, FormError } from "./AuthLayout.jsx";
import { AuthInput, AuthSubmit } from "./AuthInput.jsx";

const HERO = {
  eyebrow: null,
  title: ["Get back to", "your business", "in no time"],
  accentLine: 2,
  body: "Choose a password with at least 10 characters. You’ll be signed in straight after.",
  points: [
    ["shield", "Your Data Stays Safe", "Your information is always protected."],
    [
      "lock",
      "Single-use link",
      "Each emailed link works once and then expires.",
    ],
    ["refresh", "Quick Access", "Get back to your account in minutes."],
  ],
  image: "authResetSalon",
};

/** Shared by "reset password" and "accept invite": both set a password using an emailed token. */
export function SetPasswordForm({ title, endpoint, button, needsTerms }) {
  const [params] = useSearchParams();
  const { adoptToken } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [terms, setTerms] = useState(!needsTerms);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await api.post(endpoint, {
        token: params.get("token"),
        password: pw,
        ...(needsTerms ? { acceptTerms: true } : {}),
      });
      if (r.data.data.accessToken) {
        await adoptToken(r.data.data.accessToken);
        navigate("/app");
      } else setDone(true);
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout hero={HERO} title={title}>
      {done ? (
        <p className="text-sm">
          Password updated. You’ve been signed out of other devices.{" "}
          <Link to="/login" className="font-semibold text-mauve">
            Sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <FormError msg={err} />
          <AuthInput
            label="New password"
            icon="lock"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            placeholder="Enter a new password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            hint="At least 10 characters."
          />
          {needsTerms && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />{" "}
              I agree to the Terms and Privacy Policy.
            </label>
          )}
          <AuthSubmit busy={busy} disabled={pw.length < 10 || !terms}>
            {button}
          </AuthSubmit>
        </form>
      )}
    </AuthLayout>
  );
}

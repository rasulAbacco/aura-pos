import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, errorMessage } from "../../lib/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { AuthLayout, FormError } from "./components/AuthLayout.jsx";
import { AuthInput, AuthSubmit } from "./components/AuthInput.jsx";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  salonName: z.string().trim().min(2, "Enter your salon’s name"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,18}$/, "Enter a valid phone number"),
  password: z.string().min(10, "At least 10 characters"),
  acceptTerms: z.literal(true, {
    message: "Please accept the terms to continue",
  }),
});

const HERO = {
  eyebrow: "Get started today",
  title: ["Your salon’s", "next chapter", "starts here"],
  accentLine: 2,
  body: (
    <>
      Start your <b className="font-semibold text-ink">14-day free trial</b> and
      experience a simpler way to manage your salon or spa. No card needed.
      You’ll set up your services and staff next.
    </>
  ),
  points: [
    [
      "calendar",
      "Manage Appointments",
      "Keep your schedule organized and your clients happy.",
    ],
    [
      "card",
      "Easy Payments",
      "Accept cash, card, UPI and more with GST-ready billing.",
    ],
    [
      "users",
      "Grow Your Team",
      "Add staff, track performance and manage commissions.",
    ],
  ],
  image: "authRegisterSalon",
};

export default function RegisterPage() {
  const { adoptToken } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (v) => {
    setErr("");
    try {
      const r = await api.post("/auth/register", v);
      await adoptToken(r.data.data.accessToken);
      navigate("/app/settings");
    } catch (e) {
      setErr(errorMessage(e));
    }
  });
  return (
    <AuthLayout
      hero={HERO}
      title="Start your free trial"
      subtitle="14 days, no card needed. You’ll set up services and staff next."
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-semibold text-mauve" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError msg={err} />
        <AuthInput
          label="Your name"
          icon="user"
          autoComplete="name"
          placeholder="Enter your name"
          {...register("name")}
          error={errors.name?.message}
        />
        <AuthInput
          label="Salon or spa name"
          icon="store"
          autoComplete="organization"
          placeholder="Enter your salon or spa name"
          {...register("salonName")}
          error={errors.salonName?.message}
        />
        <AuthInput
          label="Work email"
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder="Enter your work email"
          {...register("email")}
          error={errors.email?.message}
        />
        <AuthInput
          label="Phone"
          icon="phone"
          type="tel"
          autoComplete="tel"
          placeholder="Enter your phone number"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <AuthInput
          label="Password"
          icon="lock"
          type="password"
          autoComplete="new-password"
          placeholder="Enter your password"
          {...register("password")}
          error={errors.password?.message}
          hint="At least 10 characters."
        />
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--color-mauve)]"
            {...register("acceptTerms")}
          />{" "}
          <span>
            I agree to the{" "}
            <Link
              to="/terms"
              className="text-mauve underline underline-offset-2"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="text-mauve underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="-mt-2 text-xs text-rose-700">
            {errors.acceptTerms.message}
          </p>
        )}
        <AuthSubmit busy={isSubmitting}>Create account</AuthSubmit>
      </form>
    </AuthLayout>
  );
}

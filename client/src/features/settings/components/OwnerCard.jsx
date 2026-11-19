import { useState } from "react";
import { LuCrown, LuMail, LuPhone } from "react-icons/lu";
import { api, errorMessage } from "../../../lib/api.js";
import { Badge, Button } from "../../../components/ui";
import { Field } from "../../../components/forms";
import { Modal } from "../../../components/modals";
import { useToast } from "../../../contexts/ToastContext.jsx";
import { useAuth } from "../../../contexts/AuthContext.jsx";

/**
 * The salon owner: one account for the whole salon, with access to every branch.
 * The owner can change their own sign-in mobile here (saved on their profile, not on a branch).
 */
export function OwnerCard({ users, branchCount }) {
  const toast = useToast();
  const { me, reload } = useAuth();
  const [phone, setPhone] = useState(null);
  // The team list has the owner; people without team access see their own account instead.
  const owner =
    (users.data ?? []).find((u) => u.role === "OWNER") ??
    (me?.user.role === "OWNER" ? me.user : null);
  if (!owner) return null;
  const mine = owner.id === me?.user.id;

  const save = async () => {
    try {
      await api.patch("/auth/me", { phone });
      toast("Mobile number saved");
      setPhone(null);
      users.reload?.();
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg font-bold text-rose-800">
        {owner.name
          ?.split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-stone-900">
          {owner.name}
          <Badge tone="rose">
            <LuCrown size={11} aria-hidden className="mr-1" />
            Owner
          </Badge>
          <span className="text-xs font-normal text-stone-500">
            Access to{" "}
            {branchCount > 1 ? `all ${branchCount} branches` : "every branch"}
          </span>
        </p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <LuMail size={14} aria-hidden />
            {owner.email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LuPhone size={14} aria-hidden />
            {owner.phone || (
              <span className="text-stone-400">No mobile number</span>
            )}
          </span>
        </p>
      </div>
      {mine && (
        <Button size="sm" onClick={() => setPhone(owner.phone ?? "")}>
          {owner.phone ? "Change mobile" : "Add mobile"}
        </Button>
      )}

      {phone !== null && (
        <Modal
          open
          onClose={() => setPhone(null)}
          title="Your mobile number"
          description="Used to sign in with a mobile number. The branch phone printed on receipts is set per branch below."
          footer={
            <>
              <Button onClick={() => setPhone(null)}>Cancel</Button>
              <Button variant="primary" onClick={save}>
                Save
              </Button>
            </>
          }
        >
          <Field
            label="Mobile number"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
          />
        </Modal>
      )}
    </div>
  );
}

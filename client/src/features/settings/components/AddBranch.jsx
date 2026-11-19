import { useState } from "react";
import { Link } from "react-router-dom";
import { LuPlus, LuStore } from "react-icons/lu";
import { api, errorMessage } from "../../../lib/api.js";
import { Button } from "../../../components/ui";
import { Field } from "../../../components/forms";
import { Modal } from "../../../components/modals/Modal.jsx";
import { useToast } from "../../../contexts/ToastContext.jsx";
import { useAuth } from "../../../hooks/useAuth.js";

const EMPTY = {
  name: "",
  code: "",
  address: "",
  phone: "",
  upiId: "",
  receiptFooter: "",
};

/** Suggest an invoice code from the branch name: "Indiranagar" -> "IND", not already used. */
function suggestCode(name, used) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  if (base.length < 2) return "";
  if (!used.has(base)) return base;
  for (let i = 2; i < 100; i += 1) {
    const c = `${base.slice(0, 3)}${i}`.slice(0, 5);
    if (!used.has(c)) return c;
  }
  return "";
}

/**
 * "Add branch" card at the top of the branches part of Settings.
 * Shows "N of M branches used" from the plan; the server still enforces the limit.
 */
export function AddBranch({ branches, stateCode, onAdded }) {
  const toast = useToast();
  const { me, reload } = useAuth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const max = me?.entitlement?.limits?.maxBranches ?? 1;
  const used = branches.filter((b) => b.isActive !== false).length;
  const full = used >= max;
  const usedCodes = new Set(branches.map((b) => b.code));

  const setName = (e) => {
    const name = e.target.value;
    setF((p) => ({
      ...p,
      name,
      code: codeTouched ? p.code : suggestCode(name, usedCodes),
    }));
  };
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const close = () => {
    setOpen(false);
    setF(EMPTY);
    setCodeTouched(false);
    setErr("");
  };

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const r = await api.post("/settings/branches", {
        name: f.name.trim(),
        code: f.code.trim().toUpperCase(),
        address: f.address.trim() || null,
        phone: f.phone.trim() || null,
        upiId: f.upiId.trim() || null,
        receiptFooter: f.receiptFooter.trim() || null,
        stateCode: stateCode || null,
      });
      toast(`${r.data.data.name} added`);
      close();
      await reload(); // the branch switcher in the top bar now lists it
      onAdded?.(r.data.data); // Settings opens the new branch's settings
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
        <LuStore aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-900">Branches</p>
        <p className="text-sm text-stone-500">
          {used} of {max} branch{max === 1 ? "" : "es"} used on your plan.
          {full && (
            <>
              {" "}
              <Link
                to="/app/subscription"
                className="font-semibold text-rose-700 hover:underline"
              >
                Upgrade
              </Link>{" "}
              to add more.
            </>
          )}
        </p>
      </div>
      <Button
        variant="primary"
        onClick={() => setOpen(true)}
        disabled={full}
        title={full ? "Your plan limit is reached" : undefined}
      >
        <LuPlus aria-hidden /> Add branch
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Add a branch"
        description="Each branch has its own chairs, appointments, stock and invoice numbers. Switch between branches from the top bar."
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              onClick={save}
              disabled={
                saving ||
                f.name.trim().length < 2 ||
                !/^[A-Za-z0-9]{2,5}$/.test(f.code)
              }
            >
              {saving ? "Adding…" : "Add branch"}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Branch name"
            value={f.name}
            onChange={setName}
            placeholder="Indiranagar"
            required
          />
          <Field
            label="Invoice code"
            value={f.code}
            maxLength={5}
            onChange={(e) => {
              setCodeTouched(true);
              setF((p) => ({
                ...p,
                code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              }));
            }}
            hint="2–5 letters/digits, used in invoice numbers. Can't be changed later."
            required
          />
          <Field
            label="Address"
            as="textarea"
            value={f.address}
            onChange={set("address")}
            className="sm:col-span-2"
          />
          <Field
            label="Phone"
            value={f.phone}
            onChange={set("phone")}
            inputMode="tel"
          />
          <Field
            label="UPI ID (printed on receipts)"
            value={f.upiId}
            onChange={set("upiId")}
            placeholder="salon@okhdfcbank"
          />
          <Field
            label="Receipt footer"
            value={f.receiptFooter}
            onChange={set("receiptFooter")}
            className="sm:col-span-2"
          />
          {err && (
            <p role="alert" className="text-sm text-rose-700 sm:col-span-2">
              {err}
            </p>
          )}
          <button type="submit" hidden aria-hidden />
        </form>
      </Modal>
    </div>
  );
}
    
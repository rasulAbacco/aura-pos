import { useState } from "react";
import { LuUserPlus, LuStore } from "react-icons/lu";
import { api, errorMessage } from "../../../lib/api.js";
import { Badge, Button } from "../../../components/ui";
import { Field } from "../../../components/forms";
import { Modal } from "../../../components/modals";
import { useToast } from "../../../contexts/ToastContext.jsx";
import { useAuth } from "../../../contexts/AuthContext.jsx";

export const ROLES = {
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist / cashier",
  STYLIST: "Stylist / therapist",
  INVENTORY_MANAGER: "Inventory manager",
  ACCOUNTANT: "Accountant",
  OWNER: "Owner",
};

/** Does this person work in this branch? The owner and "all branches" users work everywhere. */
export const worksIn = (u, branchId) =>
  u.role === "OWNER" || u.allBranches || u.branchIds.includes(branchId);

/** "All branches" / "This branch only" / "Indiranagar, Whitefield". */
function accessLabel(u, branch, branches) {
  if (u.allBranches) return "All branches";
  if (u.branchIds.length === 1 && u.branchIds[0] === branch.id)
    return "This branch only";
  return branches
    .filter((b) => u.branchIds.includes(b.id))
    .map((b) => b.name)
    .join(", ");
}

/** Tick-boxes for which branches someone can work in. */
function BranchAccessPicker({ value, onChange, branches }) {
  const toggle = (id) =>
    onChange({
      ...value,
      branchIds: value.branchIds.includes(id)
        ? value.branchIds.filter((x) => x !== id)
        : [...value.branchIds, id],
    });
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-stone-700">
        Works in
      </legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-rose-700"
          checked={value.allBranches}
          onChange={(e) =>
            onChange({ ...value, allBranches: e.target.checked })
          }
        />{" "}
        All branches (including ones you add later)
      </label>
      {!value.allBranches && (
        <div className="grid gap-1.5 rounded-lg border border-stone-200 p-3 sm:grid-cols-2">
          {branches.map((b, i) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-rose-700"
                checked={value.branchIds.includes(b.id)}
                onChange={() => toggle(b.id)}
              />
              {b.name}
              {i === 0 && (
                <span className="text-xs text-stone-400">(main)</span>
              )}
            </label>
          ))}
        </div>
      )}
      {!value.allBranches && !value.branchIds.length && (
        <p className="text-xs text-rose-700">Pick at least one branch.</p>
      )}
    </fieldset>
  );
}

/**
 * The team of ONE branch: who can sign in and work here, with which role.
 * The owner is shown in "Owner & business" above, not here. Disabling someone signs them out everywhere.
 */
export function TeamSection({ branch, branches, users }) {
  const toast = useToast();
  const { me } = useAuth();
  const isMe = (u) => u.id === me?.user.id;
  const [invite, setInvite] = useState(null);
  const [phoneEdit, setPhoneEdit] = useState(null); // { user, phone }
  const [access, setAccess] = useState(null); // { user, allBranches, branchIds }

  const team = (users.data ?? []).filter(
    (u) => u.role !== "OWNER" && worksIn(u, branch.id),
  );
  const multi = branches.length > 1;

  const send = async () => {
    try {
      await api.post("/users/invite", {
        name: invite.name,
        email: invite.email,
        phone: invite.phone,
        role: invite.role,
        allBranches: invite.allBranches,
        branchIds: invite.allBranches ? [] : invite.branchIds,
      });
      toast(`Invitation sent to ${invite.email}`);
      setInvite(null);
      users.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const savePhone = async () => {
    const url = isMe(phoneEdit.user)
      ? "/auth/me"
      : `/users/${phoneEdit.user.id}`;
    try {
      await api.patch(url, { phone: phoneEdit.phone });
      toast("Mobile number saved");
      setPhoneEdit(null);
      users.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const saveAccess = async () => {
    try {
      await api.patch(`/users/${access.user.id}`, {
        allBranches: access.allBranches,
        branchIds: access.allBranches ? [] : access.branchIds,
      });
      toast(`${access.user.name}'s branches updated`);
      setAccess(null);
      users.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const toggle = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      toast(
        u.isActive ? `${u.name} can no longer sign in` : `${u.name} re-enabled`,
      );
      users.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const canSendInvite =
    invite &&
    invite.name.trim().length >= 2 &&
    invite.email.includes("@") &&
    (invite.allBranches || invite.branchIds.length > 0);

  return (
    <>
      {users.loading ? (
        <p className="text-sm text-stone-500">Loading team…</p>
      ) : !team.length ? (
        <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          No one works in {branch.name} yet. Invite your first team member.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 text-sm">
          {team.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
            >
              <span className="min-w-0">
                <b>{u.name}</b>{" "}
                <span className="text-stone-500">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ""}
                </span>
                {multi && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                    <LuStore size={12} aria-hidden />
                    {accessLabel(u, branch, branches)}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Badge>{ROLES[u.role]}</Badge>
                {u.invitePending && <Badge tone="amber">Invite pending</Badge>}
                {!u.isActive && <Badge>Disabled</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPhoneEdit({ user: u, phone: u.phone ?? "" })
                  }
                >
                  {u.phone ? "Change mobile" : "Add mobile"}
                </Button>
                {multi && !isMe(u) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setAccess({
                        user: u,
                        allBranches: u.allBranches,
                        branchIds: u.branchIds,
                      })
                    }
                  >
                    Branches
                  </Button>
                )}
                {!isMe(u) && (
                  <Button size="sm" variant="ghost" onClick={() => toggle(u)}>
                    {u.isActive ? "Disable" : "Enable"}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        className="mt-3"
        onClick={() =>
          setInvite({
            name: "",
            email: "",
            phone: "",
            role: "RECEPTIONIST",
            allBranches: false,
            branchIds: [branch.id],
          })
        }
      >
        <LuUserPlus aria-hidden /> Invite to {branch.name}
      </Button>

      {invite && (
        <Modal
          open
          onClose={() => setInvite(null)}
          title={`Invite a team member to ${branch.name}`}
          description="They get an email link to set a password, and see only the branches you pick."
          footer={
            <>
              <Button onClick={() => setInvite(null)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!canSendInvite}
                onClick={send}
              >
                Send invitation
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Field
              label="Name"
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
            />
            <Field
              label="Email"
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            />
            <Field
              label="Mobile number"
              type="tel"
              inputMode="tel"
              value={invite.phone}
              onChange={(e) => setInvite({ ...invite, phone: e.target.value })}
              hint="Needed if your team signs in with their mobile number."
            />
            <Field
              as="select"
              label="Role"
              value={invite.role}
              onChange={(e) => setInvite({ ...invite, role: e.target.value })}
            >
              {Object.entries(ROLES)
                .filter(([k]) => k !== "OWNER")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </Field>
            {multi && (
              <BranchAccessPicker
                value={invite}
                onChange={(v) => setInvite({ ...invite, ...v })}
                branches={branches}
              />
            )}
          </div>
        </Modal>
      )}
      {access && (
        <Modal
          open
          onClose={() => setAccess(null)}
          title={`Branches for ${access.user.name}`}
          description="They see bills, appointments, stock and reports only for these branches. Takes effect on their next action."
          footer={
            <>
              <Button onClick={() => setAccess(null)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!access.allBranches && !access.branchIds.length}
                onClick={saveAccess}
              >
                Save
              </Button>
            </>
          }
        >
          <BranchAccessPicker
            value={access}
            onChange={(v) => setAccess({ ...access, ...v })}
            branches={branches}
          />
        </Modal>
      )}
      {phoneEdit && (
        <Modal
          open
          onClose={() => setPhoneEdit(null)}
          title={
            isMe(phoneEdit.user)
              ? "Your mobile number"
              : `Mobile number for ${phoneEdit.user.name}`
          }
          description="Used to sign in with a mobile number. This is the person’s own number — the branch phone on receipts is separate."
          footer={
            <>
              <Button onClick={() => setPhoneEdit(null)}>Cancel</Button>
              <Button variant="primary" onClick={savePhone}>
                Save
              </Button>
            </>
          }
        >
          <Field
            label="Mobile number"
            type="tel"
            inputMode="tel"
            value={phoneEdit.phone}
            onChange={(e) =>
              setPhoneEdit({ ...phoneEdit, phone: e.target.value })
            }
            placeholder="98765 43210"
          />
        </Modal>
      )}
    </>
  );
}

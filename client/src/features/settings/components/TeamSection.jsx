import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { Badge, Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useApi } from '../../../hooks/useApi.js';
import { useToast } from '../../../contexts/ToastContext.jsx';

const ROLES = { MANAGER: 'Manager', RECEPTIONIST: 'Receptionist / cashier', STYLIST: 'Stylist / therapist', INVENTORY_MANAGER: 'Inventory manager', ACCOUNTANT: 'Accountant', OWNER: 'Owner' };

/** Who can sign in, with which role. Disabling someone signs them out everywhere immediately. */
export function TeamSection() {
  const toast = useToast();
  const list = useApi('/users');
  const [invite, setInvite] = useState(null);
  const send = async () => {
    try { await api.post('/users/invite', { ...invite, allBranches: true }); toast(`Invitation sent to ${invite.email}`); setInvite(null); list.reload(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  };
  const toggle = async (u) => {
    try { await api.patch(`/users/${u.id}`, { isActive: !u.isActive }); toast(u.isActive ? `${u.name} can no longer sign in` : `${u.name} re-enabled`); list.reload(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  };
  return (
    <>
      <ul className="divide-y divide-stone-100 text-sm">
        {(list.data ?? []).map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span><b>{u.name}</b> <span className="text-stone-500">{u.email}</span></span>
            <span className="flex items-center gap-2">
              <Badge tone={u.role === 'OWNER' ? 'rose' : 'stone'}>{ROLES[u.role]}</Badge>
              {u.invitePending && <Badge tone="amber">Invite pending</Badge>}
              {!u.isActive && <Badge>Disabled</Badge>}
              {u.role !== 'OWNER' && <Button size="sm" variant="ghost" onClick={() => toggle(u)}>{u.isActive ? 'Disable' : 'Enable'}</Button>}
            </span>
          </li>
        ))}
      </ul>
      <Button className="mt-3" onClick={() => setInvite({ name: '', email: '', role: 'RECEPTIONIST' })}>Invite a team member</Button>
      {invite && (
        <Modal open onClose={() => setInvite(null)} title="Invite a team member" description="They get an email link to set a password."
          footer={<><Button onClick={() => setInvite(null)}>Cancel</Button><Button variant="primary" disabled={invite.name.length < 2 || !invite.email.includes('@')} onClick={send}>Send invitation</Button></>}>
          <div className="space-y-3">
            <Field label="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
            <Field label="Email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            <Field as="select" label="Role" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
              {Object.entries(ROLES).filter(([k]) => k !== 'OWNER').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}

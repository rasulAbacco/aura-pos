/** Salon settings: business & GST, each branch's receipt details, coupons, team access. */
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { PageHeader, ErrorNote, Skeleton } from '../../components/ui';
import { useApi } from '../../hooks/useApi.js';
import { SettingsSection } from './components/SettingsSection.jsx';
import { BusinessProfileForm } from './components/BusinessProfileForm.jsx';
import { BranchForm } from './components/BranchForm.jsx';
import { CouponsSection } from './components/CouponsSection.jsx';
import { TeamSection } from './components/TeamSection.jsx';

export default function SettingsPage() {
  const { can, reload } = useAuth();
  const s = useApi('/settings');
  const [formKey, setFormKey] = useState(0); // remount forms with fresh values after a save
  useEffect(() => { if (s.data) setFormKey((k) => k + 1); }, [s.data]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PageHeader title="Salon settings" subtitle="Business details, GST, receipts, coupons and team access." />
      {s.error && <ErrorNote onRetry={s.reload}>{s.error}</ErrorNote>}
      {s.loading || !s.data ? <Skeleton rows={6} /> : <>
        <SettingsSection title="Business & GST" description="Used on every invoice. Changes apply to new bills; past invoices keep their original details.">
          <BusinessProfileForm key={`p${formKey}`} tenant={s.data} onSaved={() => { s.reload(); reload(); }} />
        </SettingsSection>
        {s.data.branches.map((b) => (
          <SettingsSection key={b.id} title={`Branch: ${b.name}`} description="Address, phone and UPI ID printed on this branch’s receipts.">
            <BranchForm key={`b${formKey}`} branch={b} onSaved={s.reload} />
          </SettingsSection>
        ))}
        <SettingsSection title="Coupons" description="Codes cashiers can apply at the counter."><CouponsSection /></SettingsSection>
        {can('users.manage') && <SettingsSection title="Team access" description="Who can sign in, and with which role. Disabling someone signs them out everywhere."><TeamSection /></SettingsSection>}
      </>}
    </div>
  );
}

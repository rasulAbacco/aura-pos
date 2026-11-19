/**
 * Salon settings, in two clearly separate parts:
 *   1. Owner & business: the owner, business & GST, branches (add one), coupons. Applies to the whole salon.
 *   2. Branch settings: pick a branch in the dropdown; everything below it (receipt details, chairs &
 *      floors, team) is for that branch only. The choice is kept in the URL (?branch=) so a refresh
 *      or a shared link opens the same branch.
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuBuilding2, LuStore, LuChevronDown } from 'react-icons/lu';
import { useAuth } from '../../hooks/useAuth.js';
import { PageHeader, ErrorNote, Skeleton } from '../../components/ui';
import { useApi } from '../../hooks/useApi.js';
import { SettingsSection } from './components/SettingsSection.jsx';
import { BusinessProfileForm } from './components/BusinessProfileForm.jsx';
import { BranchForm } from './components/BranchForm.jsx';
import { AddBranch } from './components/AddBranch.jsx';
import { OwnerCard } from './components/OwnerCard.jsx';
import { CouponsSection } from './components/CouponsSection.jsx';
import { SalonAppSettings, BranchAppSettings } from './components/CustomerAppSettings.jsx';
import { BranchHours } from './components/BranchHours.jsx';
import { ChairsSection } from './components/ChairsSection.jsx';
import { TeamSection } from './components/TeamSection.jsx';

function PartHeading({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white"><Icon aria-hidden /></span>
      <div><h2 className="text-lg font-bold text-stone-900">{title}</h2><p className="text-sm text-stone-500">{sub}</p></div>
    </div>
  );
}

export default function SettingsPage() {
  const { me, can, reload } = useAuth();
  const s = useApi('/settings');
  const users = useApi(can('users.manage') ? '/users' : null);
  const [params, setParams] = useSearchParams();

  // Only the branches this person may manage (an owner sees all of them). First created = main branch.
  const branches = useMemo(() => {
    const mine = new Set((me?.branches ?? []).map((b) => b.id));
    return (s.data?.branches ?? []).filter((b) => mine.has(b.id));
  }, [s.data, me]);
  const wanted = params.get('branch') ?? sessionStorage.getItem('aura.branch');
  const branch = branches.find((b) => b.id === wanted) ?? branches[0];
  const isMain = branch && branch.id === s.data?.branches[0]?.id;
  const pick = (id) => { const n = new URLSearchParams(params); n.set('branch', id); setParams(n, { replace: true }); };

  // Deep links such as /app/settings#chairs (from the billing counter) scroll once the page has loaded.
  const loaded = !!s.data;
  useEffect(() => { if (loaded && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }); }, [loaded]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PageHeader title="Salon settings" subtitle="Salon-wide details first, then the settings of each branch." />
      {s.error && <ErrorNote onRetry={s.reload}>{s.error}</ErrorNote>}
      {!s.data ? (s.loading && <Skeleton rows={6} />) : <>
        {/* ── Part 1: the whole salon ─────────────────────────────── */}
        <PartHeading icon={LuBuilding2} title="Owner & business" sub="Applies to the whole salon and every branch." />
        <SettingsSection title="Owner"><OwnerCard users={users} branchCount={s.data.branches.length} /></SettingsSection>
        <SettingsSection title="Business & GST" description="Used on every invoice in every branch. Changes apply to new bills; past invoices keep their original details.">
          {/* Refilled only when the record changed on the server (key = updatedAt), so saving never wipes typing elsewhere. */}
          <BusinessProfileForm key={`p${s.data.updatedAt}`} tenant={s.data} onSaved={() => { s.reload(); reload(); }} />
        </SettingsSection>
        {can('settings.manage') && <AddBranch branches={s.data.branches} stateCode={s.data.stateCode} onAdded={(b) => { s.reload(); if (b) pick(b.id); }} />}
        <SettingsSection title="Coupons" description="Codes cashiers can apply at the counter, in every branch."><CouponsSection /></SettingsSection>
        <SettingsSection id="customer-app" title="Customer app" description="How your salon appears in the Salora Glam app, where customers find salons, request bookings and order products.">
          <SalonAppSettings key={`a${s.data.updatedAt}`} tenant={s.data} onSaved={s.reload} />
        </SettingsSection>

        {/* ── Part 2: one branch ──────────────────────────────────── */}
        {branch && (
          <div className="space-y-5 rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-3 sm:p-4">
            <div className="sticky top-0 z-10 -mx-3 -mt-3 flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-rose-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-4 sm:-mt-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-700 text-white"><LuStore aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-stone-900">Branch settings</h2>
                <p className="text-sm text-stone-500">Everything in this box is for <b className="text-stone-800">{branch.name}</b> only.</p>
              </div>
              {branches.length > 1 ? (
                <label className="flex w-full items-center gap-2 text-sm font-medium text-stone-700 sm:w-auto">
                  <span>Branch</span>
                  <span className="relative flex-1 sm:flex-none">
                    <select aria-label="Branch to set up" value={branch.id} onChange={(e) => pick(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-rose-300 bg-white py-2 pl-3 pr-9 font-semibold text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.id === s.data.branches[0].id ? ' (main)' : ''}</option>)}
                    </select>
                    <LuChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  </span>
                </label>
              ) : (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-800">{branch.name}{isMain ? ' · main' : ''}</span>
              )}
            </div>

            {/* key={branch.id}: switching branches remounts every form, so nothing carries over from the last branch. */}
            <div key={branch.id} className="space-y-5">
              <SettingsSection title="Branch details" description={`Address, phone and UPI ID printed on ${branch.name}’s receipts. Invoice code ${branch.code}.`}>
                <BranchForm key={`b${branch.updatedAt}`} branch={branch} onSaved={() => { s.reload(); reload(); }} />
              </SettingsSection>
              <SettingsSection id="hours" title="Opening hours" description={`When ${branch.name} is open. Customers can only book app appointments inside these hours.`}>
                <BranchHours key={`h${branch.updatedAt}`} branch={branch} onSaved={s.reload} />
              </SettingsSection>
              <SettingsSection title="Customer app at this branch" description={`Whether ${branch.name} takes booking requests and product orders from the Salora Glam app.`}>
                <BranchAppSettings key={`o${branch.updatedAt}`} branch={branch} onSaved={s.reload} />
              </SettingsSection>
              <SettingsSection id="chairs" title="Chairs & floors" description={`The floor plan on ${branch.name}’s billing counter. Group chairs, rooms and stations by floor and set their order.`}>
                <ChairsSection branch={branch} />
              </SettingsSection>
              {can('users.manage') && (
                <SettingsSection title={`Team at ${branch.name}`} description="People who can sign in and work in this branch. The owner has access to every branch. Disabling someone signs them out everywhere.">
                  <TeamSection branch={branch} branches={branches} users={users} />
                </SettingsSection>
              )}
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

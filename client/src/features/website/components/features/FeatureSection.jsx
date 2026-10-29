import { CheckList } from '../common';
import { FeatureBillMock, AppointmentsWeekMock, ClientProfileMock, TiersMock, ProductsTableMock, StaffTableMock, PnlMock } from '../mockups';
import { IMG } from '../../utils/siteImages.js';

const AV = [IMG.avatar1, IMG.avatar2, IMG.avatar3, IMG.avatar4, IMG.avatar5];
const MOCKS = {
  bill: () => <FeatureBillMock avatars={AV} />, calendar: () => <AppointmentsWeekMock />, client: () => <ClientProfileMock avatar={IMG.avatar2} />,
  tiers: () => <TiersMock />, products: () => <ProductsTableMock />, staff: () => <StaffTableMock avatars={AV} />, pnl: () => <PnlMock />,
};

/** One numbered feature block; even sections put the illustration on the left. */
export function FeatureSection({ section, index }) {
  const Mock = MOCKS[section.mock];
  const flip = index % 2 === 1;
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-14">
        <div data-reveal className={flip ? 'lg:order-2' : ''}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-mauve text-sm font-semibold text-white">{section.no}</span>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-mauve">{section.eyebrow}</p>
          </div>
          <h2 className="mt-4 font-display text-3xl leading-tight text-ink md:text-[2.2rem]">{section.title.map((l, i) => <span key={i} className="block">{l}</span>)}</h2>
          <CheckList items={section.items} columns={2} className="mt-6" />
        </div>
        <div data-reveal className={flip ? 'lg:order-1' : ''}><Mock /></div>
      </div>
    </section>
  );
}

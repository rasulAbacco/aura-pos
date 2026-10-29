import { SectionTitle, SiteIcon } from '../common';
import { WORKFLOW } from '../../utils/siteContent.js';

/** Book → Bill → Pay → Report. */
export function Workflow() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 md:py-20">
      <SectionTitle title={<>From the chair to the books,<br />typed in once.</>} subtitle="A simple workflow that saves time and keeps everything in sync." />
      <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {WORKFLOW.map((s, i) => (
          <li key={s.title} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="relative flex gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mauve font-semibold text-white">{i + 1}</span>
            <div>
              <SiteIcon name={s.icon} size={30} className="text-ink" />
              <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{s.body}</p>
            </div>
            {i < WORKFLOW.length - 1 && <span className="absolute left-[6.5rem] right-[-1.25rem] top-5 hidden border-t-2 border-dashed border-blush lg:block" aria-hidden />}
          </li>
        ))}
      </ol>
    </section>
  );
}

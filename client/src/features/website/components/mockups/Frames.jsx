/** Device frames for the illustrated product screens. Content inside is plain HTML, not a screenshot. */
export function TabletFrame({ children, className = '' }) {
  return (
    <div className={`rounded-[1.6rem] bg-[#1d1a1c] p-2.5 shadow-[0_30px_60px_-25px_rgb(40_10_20/.55)] ${className}`}>
      <div className="overflow-hidden rounded-[1.1rem] bg-white">{children}</div>
    </div>
  );
}

export function LaptopFrame({ children, className = '' }) {
  return (
    <div className={className}>
      <div className="rounded-t-xl bg-[#1d1a1c] p-2 pb-2.5"><div className="overflow-hidden rounded-md bg-white">{children}</div></div>
      <div className="mx-[-6%] h-3 rounded-b-xl bg-gradient-to-b from-stone-300 to-stone-400" />
    </div>
  );
}

export function PhoneFrame({ children, className = '' }) {
  return (
    <div className={`rounded-[1.4rem] bg-[#1d1a1c] p-1.5 shadow-xl ${className}`}>
      <div className="overflow-hidden rounded-[1.1rem] bg-white">{children}</div>
    </div>
  );
}

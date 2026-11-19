import { Link } from "react-router-dom";
import {
  LuMapPin,
  LuCalendarCheck,
  LuShoppingBag,
  LuNavigation,
} from "react-icons/lu";
import { categoryLabel } from "../lib/constants.js";
import { initials, rupees } from "../lib/format.js";
import { imageUrl } from "../lib/media.js";
import { formatKm } from "../lib/location.jsx";
import { Badge } from "./ui.jsx";

const HUES = [
  "from-[#7b2843] to-[#c0566f]",
  "from-[#5a1a30] to-[#a34a62]",
  "from-[#8a4b2f] to-[#d08a63]",
  "from-[#3f3a63] to-[#8a7bc0]",
  "from-[#2f5d50] to-[#6fae98]",
];
export const salonHue = (name) =>
  HUES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % HUES.length];

export function SalonAvatar({ name, size = "md" }) {
  const s = size === "lg" ? "h-16 w-16 text-xl" : "h-14 w-14 text-lg";
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display font-semibold text-white ${s} ${salonHue(
        name,
      )}`}
    >
      {initials(name)}
    </span>
  );
}

/** Salon card: cover photo (or brand colours), type, area, distance, what can be done in the app. */
export function SalonCard({ s, km }) {
  return (
    <Link
      to={`/s/${s.slug}`}
      className="animate-rise group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-blush transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-mauve/30"
    >
      <div
        className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${salonHue(
          s.name,
        )}`}
      >
        {s.coverImageId ? (
          <img
            src={imageUrl(s.coverImageId)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center font-display text-5xl font-semibold text-white/90"
          >
            {initials(s.name)}
          </span>
        )}
        {km != null && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink shadow">
            <LuNavigation size={11} aria-hidden />
            {formatKm(km)}
          </span>
        )}
        {categoryLabel(s.category) && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-semibold text-white">
            {categoryLabel(s.category)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <p className="font-display text-lg font-semibold leading-tight">
          {s.name}
        </p>
        {s.tagline && (
          <p className="mt-0.5 line-clamp-1 text-sm text-stone-500">
            {s.tagline}
          </p>
        )}
        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-stone-600">
          <LuMapPin size={12} className="shrink-0" aria-hidden />
          <span className="min-w-0 truncate">
            {s.cities.length ? s.cities.join(", ") : s.area ?? "See salon page"}
            {s.branchCount > 1 ? ` · ${s.branchCount} branches` : ""}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {s.onlineBooking && s.serviceCount > 0 && (
            <Badge tone="green">
              <LuCalendarCheck size={11} aria-hidden />
              Book online
            </Badge>
          )}
          {s.onlineOrders && s.productCount > 0 && (
            <Badge tone="blue">
              <LuShoppingBag size={11} aria-hidden />
              Shop & pick up
            </Badge>
          )}
          {s.startingFrom && (
            <span className="ml-auto text-xs text-stone-500">
              from <b className="text-sm text-ink">{rupees(s.startingFrom)}</b>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

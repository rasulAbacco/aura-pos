import {
  LuReceiptText,
  LuCalendarDays,
  LuCreditCard,
  LuChartColumnIncreasing,
  LuUser,
  LuUsers,
  LuBoxes,
  LuUserCog,
  LuChartPie,
  LuZap,
  LuHeart,
  LuIndianRupee,
  LuNetwork,
  LuWallet,
  LuSettings,
  LuHeadset,
  LuRefreshCw,
  LuCloud,
  LuShieldCheck,
  LuLightbulb,
  LuAward,
  LuMessagesSquare,
  LuCode,
  LuRocket,
  LuCar,
  LuGraduationCap,
  LuUtensils,
  LuShoppingCart,
  LuClock,
  LuBox,
  LuMail,
  LuPhoneCall,
  LuMapPin,
  LuLock,
  LuTarget,
  LuEye,
  LuWorkflow,
  LuLayoutDashboard,
  LuStore,
} from "react-icons/lu";

const ICONS = {
  bill: LuReceiptText,
  calendar: LuCalendarDays,
  card: LuCreditCard,
  chart: LuChartColumnIncreasing,
  user: LuUser,
  users: LuUsers,
  stock: LuBoxes,
  staff: LuUserCog,
  pnl: LuChartPie,
  bolt: LuZap,
  heart: LuHeart,
  rupee: LuIndianRupee,
  branch: LuNetwork,
  wallet: LuWallet,
  gear: LuSettings,
  headset: LuHeadset,
  refresh: LuRefreshCw,
  cloud: LuCloud,
  shield: LuShieldCheck,
  bulb: LuLightbulb,
  award: LuAward,
  chat: LuMessagesSquare,
  code: LuCode,
  rocket: LuRocket,
  car: LuCar,
  grad: LuGraduationCap,
  fork: LuUtensils,
  cart: LuShoppingCart,
  clock: LuClock,
  box: LuBox,
  mail: LuMail,
  phone: LuPhoneCall,
  pin: LuMapPin,
  lock: LuLock,
  target: LuTarget,
  eye: LuEye,
  crm: LuWorkflow,
  erp: LuLayoutDashboard,
  store: LuStore,
};

/** Named outline icon used across the website (names are referenced from siteContent.js). */
export function SiteIcon({ name, size = 22, className }) {
  const Icon = ICONS[name] ?? LuBox;
  return <Icon size={size} className={className} aria-hidden />;
}

/** Icon inside a soft pink circle — the recurring motif of the templates. */
export function IconCircle({ name, size = "md", className = "" }) {
  const s = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-16 w-16" }[size];
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full bg-petal text-mauve ring-1 ring-blush ${s} ${className}`}
    >
      <SiteIcon name={name} size={size === "sm" ? 18 : 24} />
    </span>
  );
}

import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Home,
  type LucideIcon,
  Megaphone,
  PackageOpen,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Undo2,
  UsersRound,
} from "lucide-react";
import { Fragment, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

const primaryNavigation: NavigationItem[] = [
  { label: "داشبورد", icon: Home, to: "/" },
  { label: "کالا و موجودی", icon: PackageOpen, to: "/products" },
  { label: "فروش", icon: ShoppingCart, to: "/sales" },
  { label: "خریدها", icon: ClipboardList, to: "/purchases" },
  { label: "تأمین‌کنندگان", icon: Building2, to: "/suppliers" },
  { label: "هزینه‌های جاری", icon: ReceiptText, to: "/expenses" },
];

const analysisNavigation: NavigationItem[] = [
  { label: "امور مالی", icon: CircleDollarSign, to: "/financials" },
  { label: "دفتر نسیه", icon: BookOpen, to: "/credit-book" },
  { label: "مشتریان", icon: UsersRound, to: "/crm" },
  { label: "گزارش‌ها", icon: BarChart3, to: "/reports" },
];

const operationsNavigation: NavigationItem[] = [
  { label: "گردش کالا", icon: ArrowLeftRight, to: "/stock-movements" },
  { label: "صندوق نقدی", icon: Banknote, to: "/cash-register" },
  { label: "مرجوعی‌ها", icon: Undo2, to: "/returns" },
  { label: "پویش پیامکی", icon: Megaphone, to: "/crm/campaigns" },
  { label: "تنظیمات", icon: Settings2, to: "/settings" },
];

interface AppSidebarProps {
  collapsed: boolean;
  mobile?: boolean;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
}

function isItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/") return pathname === "/";
  if (itemPath === "/crm") return pathname === "/crm";
  if (itemPath === "/crm/campaigns") return pathname === "/crm/campaigns";
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function AppSidebar({
  collapsed,
  mobile = false,
  onNavigate,
  onToggleCollapsed,
}: AppSidebarProps) {
  const location = useLocation();

  const renderTooltip = (
    trigger: ReactElement,
    label: string,
    key?: string,
  ) => {
    if (!collapsed || mobile)
      return key ? <Fragment key={key}>{trigger}</Fragment> : trigger;
    return (
      <Tooltip key={key}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={mobile ? "right" : "left"} dir="rtl">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const isActive = isItemActive(location.pathname, item.to);
    const iconOnly = collapsed && !mobile;
    return renderTooltip(
      <Link
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        className={cn(
          "sidebar-link flex min-h-10 items-center gap-3 rounded-xl text-sidebar-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive &&
            "is-active bg-foreground text-background hover:bg-foreground hover:text-background",
          iconOnly
            ? "w-10 justify-center self-center"
            : "w-full justify-start px-3",
        )}
        onClick={onNavigate}
        to={item.to}
      >
        <Icon
          aria-hidden="true"
          className="shrink-0"
          size={19}
          strokeWidth={1.8}
        />
        {!iconOnly && (
          <span className="sidebar-link-label min-w-0 truncate text-sm">
            {item.label}
          </span>
        )}
      </Link>,
      item.label,
      item.to,
    );
  };

  return (
    <aside
      className={cn(
        "app-sidebar flex h-full min-h-0 shrink-0 flex-col gap-2 rounded-lg border border-border/70 bg-sidebar-background py-3 transition-[width] duration-200",
        mobile
          ? "app-sidebar-in-sheet w-full border-0 px-4"
          : collapsed
            ? "hidden w-[76px] items-center px-2 md:flex"
            : "is-expanded hidden w-[220px] items-stretch px-3 md:flex",
      )}
    >
      {mobile ? (
        <div
          aria-label="مدیریت فروشگاه"
          className="sidebar-brand flex h-11 w-full items-center justify-center"
          role="img"
        >
          <div
            aria-hidden="true"
            className="sidebar-brand-mark grid h-9 w-9 grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm [&>span]:rounded-sm [&>span]:bg-primary [&>span:nth-child(2)]:opacity-60 [&>span:nth-child(3)]:opacity-40 [&>span:nth-child(4)]:opacity-80"
          >
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : (
        renderTooltip(
          <button
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? "باز کردن نوار کناری" : "جمع‌کردن نوار کناری"
            }
            className="sidebar-brand group flex h-11 w-full items-center justify-center rounded-xl transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onToggleCollapsed}
            type="button"
          >
            <div
              aria-hidden="true"
              className="sidebar-brand-mark grid h-9 w-9 grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm group-hover:hidden [&>span]:rounded-sm [&>span]:bg-primary [&>span:nth-child(2)]:opacity-60 [&>span:nth-child(3)]:opacity-40 [&>span:nth-child(4)]:opacity-80"
            >
              <span />
              <span />
              <span />
              <span />
            </div>
            {collapsed ? (
              <ChevronLeft
                aria-hidden="true"
                className="hidden group-hover:block"
                size={20}
              />
            ) : (
              <ChevronRight
                aria-hidden="true"
                className="hidden group-hover:block"
                size={20}
              />
            )}
          </button>,
          collapsed ? "باز کردن نوار کناری" : "جمع‌کردن نوار کناری",
        )
      )}
      <nav
        aria-label="ناوبری اصلی"
        className="sidebar-nav scrollbar-indicator-hidden flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto pt-2"
      >
        <div className="sidebar-nav-section flex w-full flex-col gap-1">
          {primaryNavigation.map(renderItem)}
        </div>
        <div
          aria-hidden="true"
          className="sidebar-divider mx-auto h-px w-8 bg-border"
        />
        <div className="sidebar-nav-section flex w-full flex-col gap-1">
          {analysisNavigation.map(renderItem)}
        </div>
        <div
          aria-hidden="true"
          className="sidebar-divider mx-auto h-px w-8 bg-border"
        />
        <div className="sidebar-nav-section flex w-full flex-col gap-1">
          {operationsNavigation.map(renderItem)}
        </div>
      </nav>
    </aside>
  );
}

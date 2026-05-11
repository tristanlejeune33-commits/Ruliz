"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  HelpCircle,
  type LucideIcon,
  LogOut,
  Megaphone,
  MessageSquare,
  QrCode,
  Settings,
  Sparkles,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { usePanelLang } from "@/components/shared/panel-lang-context";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

/**
 * MobileDrawerPlus — bottom sheet "Plus" qui regroupe tout le contenu
 * secondaire qui ne tient pas dans la BottomNav (5 items max).
 *
 * Spec : `docs/design-system-mobile.md` §9 Drawer "Plus"
 *
 * 3 sections par défaut (scope dashboard) :
 *   - Acquisition : Roulette, Pop-ups, SMS, Boutique
 *   - Gestion     : Mon resto, Équipe, Facturation
 *   - Compte      : Profil, Préférences, Aide, Déconnexion (rouge)
 *
 * Pour le scope admin, on accepte un slot `adminExtras` qui prend la place
 * d'Acquisition.
 *
 * Items 56px height, icon 24 + label 16, chevron droit.
 */

interface DrawerItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  destructive?: boolean;
  /** Si défini, override le href par un onClick (ex: signOut). */
  onSelect?: () => void;
}

interface DrawerSection {
  titleKey: string;
  items: DrawerItem[];
}

const DASHBOARD_SECTIONS: DrawerSection[] = [
  {
    titleKey: "nav.section.principal",
    // QR codes (qui contient désormais la boutique fusionnée) accessible
    // directement depuis le drawer puisque l'item central de la BottomNav
    // ouvre la carte publique en nouvel onglet (action #1 du restaurateur).
    items: [
      { labelKey: "nav.qrcodes", href: "/dashboard/qrcodes", icon: QrCode },
    ],
  },
  {
    titleKey: "nav.section.acquisition",
    items: [
      { labelKey: "nav.jeu", href: "/dashboard/jeu", icon: Sparkles },
      { labelKey: "nav.popups", href: "/dashboard/popups", icon: Megaphone },
      { labelKey: "nav.sms", href: "/dashboard/sms", icon: MessageSquare },
    ],
  },
  {
    titleKey: "nav.section.gestion",
    // Équipe + Facturation accessibles via Paramètres → on garde juste Mon resto
    items: [
      { labelKey: "nav.restaurant", href: "/dashboard/restaurant", icon: Building2 },
    ],
  },
];

const ACCOUNT_SECTION: DrawerSection = {
  titleKey: "drawer.section.compte",
  items: [
    { labelKey: "userMenu.profile", href: "/dashboard/settings", icon: UserIcon },
    { labelKey: "userMenu.settings", href: "/dashboard/settings", icon: Settings },
    { labelKey: "userMenu.help", href: "/dashboard/settings", icon: HelpCircle },
    {
      labelKey: "userMenu.signOut",
      href: "#",
      icon: LogOut,
      destructive: true,
      onSelect: () => signOut(),
    },
  ],
};

interface MobileDrawerPlusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: "admin" | "dashboard";
  /** Sections supplémentaires (typiquement pour admin). */
  adminExtras?: DrawerSection[];
}

export function MobileDrawerPlus({
  open,
  onOpenChange,
  scope,
  adminExtras,
}: MobileDrawerPlusProps) {
  const sections =
    scope === "admin"
      ? [...(adminExtras ?? []), ACCOUNT_SECTION]
      : [...DASHBOARD_SECTIONS, ACCOUNT_SECTION];

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.92]}
      defaultSnap={0}
    >
      <BottomSheetHeader>
        <BottomSheetTitle>Plus</BottomSheetTitle>
      </BottomSheetHeader>

      <BottomSheetBody className="px-0">
        <div className="flex flex-col gap-6 px-2 pb-4">
          {sections.map((section) => (
            <DrawerSectionView
              key={section.titleKey}
              section={section}
              onClose={() => onOpenChange(false)}
            />
          ))}

          <div className="px-3 pt-4">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Ruliz · v1
            </p>
          </div>
        </div>
      </BottomSheetBody>
    </BottomSheet>
  );
}

function DrawerSectionView({
  section,
  onClose,
}: {
  section: DrawerSection;
  onClose: () => void;
}) {
  const { t } = usePanelLang();
  return (
    <div className="flex flex-col">
      <div className="px-4 pb-2 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          {t(section.titleKey)}
        </p>
      </div>
      <ul className="flex flex-col">
        {section.items.map((item) => (
          <li key={`${section.titleKey}-${item.labelKey}`}>
            <DrawerItemRow item={item} onSelect={onClose} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrawerItemRow({
  item,
  onSelect,
}: {
  item: DrawerItem;
  onSelect: () => void;
}) {
  const { t } = usePanelLang();
  const router = useRouter();
  const Icon = item.icon;
  const label = t(item.labelKey);

  const handleClick = () => {
    haptic.light();
    if (item.onSelect) {
      item.onSelect();
    } else {
      router.push(item.href);
    }
    onSelect();
  };

  // Si action custom (signOut), on rend un button. Sinon Link pour préserver
  // la sémantique navigation + prefetch Next.js.
  if (item.onSelect) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex h-14 w-full items-center gap-3 px-4",
          "text-left transition-colors",
          "active:bg-[var(--bg-glass-hover)]",
          item.destructive
            ? "text-[var(--neon-danger)]"
            : "text-[var(--text-primary)]",
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            item.destructive
              ? "bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]"
              : "bg-[var(--bg-glass-strong)] text-[var(--text-secondary)]",
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-base font-medium">{label}</span>
        <ChevronRight
          className="size-4 text-[var(--text-tertiary)]"
          strokeWidth={1.75}
        />
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={() => {
        haptic.light();
        onSelect();
      }}
      className={cn(
        "flex h-14 w-full items-center gap-3 px-4",
        "transition-colors",
        "active:bg-[var(--bg-glass-hover)]",
        "text-[var(--text-primary)]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          "bg-[var(--bg-glass-strong)] text-[var(--text-secondary)]",
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-base font-medium">{label}</span>
      <ChevronRight
        className="size-4 text-[var(--text-tertiary)]"
        strokeWidth={1.75}
      />
    </Link>
  );
}

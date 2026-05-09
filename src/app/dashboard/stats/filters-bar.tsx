"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Filter, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LANG_META, SUPPORTED_LANGS } from "@/lib/langs";
import type { AnalyticsFilters } from "@/server/dashboard/analytics";

const PERIOD_OPTIONS = [
  { value: "7d", label: "7 j" },
  { value: "30d", label: "30 j" },
  { value: "90d", label: "90 j" },
  { value: "365d", label: "1 an" },
  { value: "custom", label: "Période…" },
] as const;

interface FiltersBarProps {
  currentFilters: AnalyticsFilters;
  availableCountries: Array<{ code: string; name: string; flag: string }>;
  availableLangs: string[];
}

export function FiltersBar({
  currentFilters,
  availableCountries,
  availableLangs,
}: FiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "all" || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`/dashboard/stats?${params.toString()}`);
    });
  };

  const activeFiltersCount =
    (currentFilters.device && currentFilters.device !== "all" ? 1 : 0) +
    (currentFilters.os && currentFilters.os !== "all" ? 1 : 0) +
    (currentFilters.country && currentFilters.country !== "all" ? 1 : 0) +
    (currentFilters.lang && currentFilters.lang !== "all" ? 1 : 0);

  return (
    <div className="sticky top-[68px] z-20 -mx-6 border-y border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 px-6 py-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        {/* Period switcher */}
        <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParams({ period: opt.value })}
              disabled={pending}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150",
                opt.value === currentFilters.period
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {opt.value === "custom" && <CalendarRange className="size-3" />}
              {opt.label}
            </button>
          ))}
        </div>

        {currentFilters.period === "custom" && (
          <CustomDateRange
            start={currentFilters.customStart}
            end={currentFilters.customEnd}
            onChange={(start, end) => updateParams({ start, end })}
          />
        )}

        {/* Filters popover */}
        <FiltersPopover
          currentFilters={currentFilters}
          availableCountries={availableCountries}
          availableLangs={availableLangs}
          onChange={updateParams}
          activeCount={activeFiltersCount}
        />

        {pending && (
          <Loader2 className="size-3.5 animate-spin text-[var(--text-muted)]" />
        )}
      </div>
    </div>
  );
}

function CustomDateRange({
  start,
  end,
  onChange,
}: {
  start: string | undefined;
  end: string | undefined;
  onChange: (start: string | null, end: string | null) => void;
}) {
  const [localStart, setLocalStart] = useState(start ?? "");
  const [localEnd, setLocalEnd] = useState(end ?? "");

  const apply = () => {
    if (localStart && localEnd) onChange(localStart, localEnd);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={localStart}
        onChange={(e) => setLocalStart(e.target.value)}
        className="h-9 w-36"
      />
      <span className="text-xs text-[var(--text-muted)]">→</span>
      <Input
        type="date"
        value={localEnd}
        onChange={(e) => setLocalEnd(e.target.value)}
        className="h-9 w-36"
      />
      <Button size="sm" onClick={apply} disabled={!localStart || !localEnd}>
        Appliquer
      </Button>
    </div>
  );
}

function FiltersPopover({
  currentFilters,
  availableCountries,
  availableLangs,
  onChange,
  activeCount,
}: {
  currentFilters: AnalyticsFilters;
  availableCountries: Array<{ code: string; name: string; flag: string }>;
  availableLangs: string[];
  onChange: (updates: Record<string, string | null>) => void;
  activeCount: number;
}) {
  const clearAll = () =>
    onChange({ device: null, os: null, country: null, lang: null });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Filter className="size-3.5" />
          Filtres
          {activeCount > 0 && (
            <Badge className="-mr-1 ml-1 h-5 min-w-5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Filtres avancés</p>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="size-3" /> Effacer
            </Button>
          )}
        </div>

        <FilterSelect
          label="Appareil"
          value={currentFilters.device ?? "all"}
          onValueChange={(v) => onChange({ device: v })}
          options={[
            { value: "all", label: "Tous" },
            { value: "mobile", label: "Mobile" },
            { value: "tablet", label: "Tablette" },
            { value: "desktop", label: "Desktop" },
          ]}
        />

        <FilterSelect
          label="Système"
          value={currentFilters.os ?? "all"}
          onValueChange={(v) => onChange({ os: v })}
          options={[
            { value: "all", label: "Tous" },
            { value: "ios", label: "iOS" },
            { value: "android", label: "Android" },
            { value: "windows", label: "Windows" },
            { value: "macos", label: "macOS" },
          ]}
        />

        <FilterSelect
          label="Pays"
          value={currentFilters.country ?? "all"}
          onValueChange={(v) => onChange({ country: v })}
          options={[
            { value: "all", label: "Tous" },
            ...availableCountries.map((c) => ({
              value: c.code,
              label: `${c.flag} ${c.name}`,
            })),
          ]}
        />

        <FilterSelect
          label="Langue"
          value={currentFilters.lang ?? "all"}
          onValueChange={(v) => onChange({ lang: v })}
          options={[
            { value: "all", label: "Toutes" },
            ...SUPPORTED_LANGS.filter((l) => availableLangs.includes(l)).map(
              (l) => ({ value: l, label: `${LANG_META[l].flag} ${LANG_META[l].name}` }),
            ),
          ]}
        />
      </PopoverContent>
    </Popover>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

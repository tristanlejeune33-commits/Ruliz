"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HourlyHeatmapProps {
  data: Array<{ day: number; hour: number; count: number }>;
}

const DAYS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
// JS Date.getDay() returns 0=Sun, 6=Sat. We map our display order (Mon→Sun)
// to the JS day index.
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0];

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  // Build [day][hour] matrix
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const cell of data) {
    grid[cell.day]![cell.hour] = cell.count;
  }

  const max = data.reduce((m, c) => Math.max(m, c.count), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affluence horaire</CardTitle>
        <CardDescription>
          Quand tes clients consultent ta carte. Plus c&apos;est foncé, plus il y a de
          scans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-1 text-[10px]"
            style={{ gridTemplateColumns: "auto repeat(24, minmax(20px, 1fr))" }}
          >
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="text-center text-[var(--text-muted)]"
              >
                {h % 3 === 0 ? `${String(h).padStart(2, "0")}h` : ""}
              </div>
            ))}
            {DAY_INDEX.map((dayIndex, displayIndex) => (
              <RowGroup
                key={dayIndex}
                day={DAYS[displayIndex]!}
                cells={grid[dayIndex]!}
                max={max}
              />
            ))}
          </div>
        </div>
        <Legend max={max} />
      </CardContent>
    </Card>
  );
}

function RowGroup({
  day,
  cells,
  max,
}: {
  day: string;
  cells: number[];
  max: number;
}) {
  return (
    <>
      <div className="flex items-center pr-1 text-[var(--text-muted)]">{day}</div>
      {cells.map((value, h) => {
        const intensity = max === 0 ? 0 : value / max;
        return (
          <div
            key={h}
            title={`${day} ${String(h).padStart(2, "0")}h — ${value} scan${value > 1 ? "s" : ""}`}
            className="aspect-square rounded transition-transform hover:scale-110"
            style={{
              backgroundColor:
                intensity === 0
                  ? "var(--bg-elevated)"
                  : `color-mix(in oklch, var(--accent) ${Math.min(100, 15 + intensity * 85)}%, transparent)`,
            }}
          />
        );
      })}
    </>
  );
}

function Legend({ max }: { max: number }) {
  if (max === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
      <span>Moins</span>
      <div className="flex gap-0.5">
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((p) => (
          <div
            key={p}
            className="size-3 rounded-sm"
            style={{
              backgroundColor: `color-mix(in oklch, var(--accent) ${p * 100}%, transparent)`,
            }}
          />
        ))}
      </div>
      <span>Plus · max {max} scans/heure</span>
    </div>
  );
}

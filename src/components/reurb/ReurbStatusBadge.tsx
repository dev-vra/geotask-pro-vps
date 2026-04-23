import { TIPO_LABELS, TIPO_COLORS, STATUS_LABELS, STATUS_COLORS } from "@/lib/reurb/constants";

export function ReurbStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  const bg = `${color}22`;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

export function ReurbTipoBadge({ tipo }: { tipo: string }) {
  const label = TIPO_LABELS[tipo as keyof typeof TIPO_LABELS] ?? tipo;
  const color = TIPO_COLORS[tipo as keyof typeof TIPO_COLORS] ?? "#94a3b8";
  const bg = `${color}22`;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

// kept for backwards compat in ReurbProcessosPage
export { ReurbTipoBadge as ReurbTypeBadge };

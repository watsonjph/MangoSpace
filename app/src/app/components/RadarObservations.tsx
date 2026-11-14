"use client";

import Image from "next/image";
import { useState } from "react";

export type ChartPoint = { date: string; value: number | null };

export function RadarImage({ src, alt, width = 440, height = 440 }: { src: string; alt: string; width?: number; height?: number }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <p role="status">Radar image unavailable for this date and band.</p>
    : <Image unoptimized loading="eager" src={src} alt={alt} width={width} height={height} onError={() => setFailed(true)} />;
}

export function ObservationChart({ points, selectedDate, label, title, unit, domain, empty, className = "water-chart" }: {
  points: ChartPoint[];
  selectedDate: string;
  label: string;
  title: string;
  unit: string;
  domain: [number, number];
  empty: string;
  className?: string;
}) {
  const measured = points.filter(point => point.value !== null);
  const first = points[0], last = points[points.length - 1];
  if (!measured.length || !first || !last) return <p>{empty}</p>;
  const [min, max] = domain;
  const start = Date.parse(first.date), duration = Date.parse(last.date) - start;
  const x = (date: string) => duration ? 110 + (Date.parse(date) - start) / duration * 562 : 391;
  const y = (value: number) => 220 - (value - min) / (max - min) * 176;
  const path = points.map((point, index) => point.value === null ? "" :
    `${!index || points[index - 1].value === null ? "M" : "L"}${x(point.date)},${y(point.value)}`).join(" ");
  return <svg className={className} viewBox="0 0 736 280" role="img" aria-label={label}>
    {[min, (min + max) / 2, max].map(tick => <g key={tick}>
      <line x1="110" x2="672" y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
      <text x="98" y={y(tick) + 5} textAnchor="end">{tick.toFixed(2)}</text>
    </g>)}
    <text x="110" y="22">{title}</text>
    <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" />
    {points.map(point => point.value !== null && <circle key={point.date}
      cx={x(point.date)} cy={y(point.value)} r={point.date === selectedDate ? 7 : 4}
      fill={point.date === selectedDate ? "var(--dry)" : "var(--accent)"}>
      <title>{point.date}: {point.value.toFixed(3)} {unit}</title>
    </circle>)}
    <text x="110" y="252">{first.date}</text>
    <text x="672" y="252" textAnchor="end">{last.date}</text>
  </svg>;
}

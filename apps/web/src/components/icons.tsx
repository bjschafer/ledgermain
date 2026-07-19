import type { ReactNode } from "react";

/**
 * Small line-icon set for section scanability (Panel's `icon` prop) — one
 * shape per concept, simple enough to read at ~18px. All share the same
 * stroke weight/viewBox via this wrapper so a row of panel headers reads as
 * one consistent icon language rather than a grab-bag of styles.
 */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PersonIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20C5 16.13 8.13 13 12 13C15.87 13 19 16.13 19 20" />
    </Icon>
  );
}

export function DumbbellIcon() {
  return (
    <Icon>
      <path d="M6 12H18" strokeWidth="2.75" />
      <path d="M5 9V15M19 9V15" />
      <path d="M2 6V18M22 6V18" />
    </Icon>
  );
}

export function LeafIcon() {
  return (
    <Icon>
      <path d="M19 5C11 5 5 10 5 19C14 19 19 13 19 5Z" />
      <path d="M6 18C10.5 13 14 9.5 18.5 5.5" />
    </Icon>
  );
}

export function ShieldIcon() {
  return (
    <Icon>
      <path d="M12 3L19 6V12C19 16.5 16 19.5 12 21C8 19.5 5 16.5 5 12V6Z" />
    </Icon>
  );
}

export function BookIcon() {
  return (
    <Icon>
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12V20H5.5C4.67 20 4 19.33 4 18.5Z" />
      <path d="M20 5.5C20 4.67 19.33 4 18.5 4H12V20H18.5C19.33 20 20 19.33 20 18.5Z" />
    </Icon>
  );
}

export function StarIcon() {
  return (
    <Icon>
      <path d="M12 3L14.6 8.8L21 9.4L16.2 13.6L17.6 19.8L12 16.9L6.4 19.8L7.8 13.6L3 9.4L9.4 8.8Z" />
    </Icon>
  );
}

export function GemIcon() {
  return (
    <Icon>
      <path d="M8 4H16L20 9L12 20L4 9Z" />
      <path d="M4 9H20M9 4L4 9L12 20L20 9L15 4" />
    </Icon>
  );
}

export function HeartIcon() {
  return (
    <Icon>
      <path d="M12 20C12 20 3 15 3 8.5C3 5.8 5.1 4 7.5 4C9.4 4 11 5.2 12 6.7C13 5.2 14.6 4 16.5 4C18.9 4 21 5.8 21 8.5C21 15 12 20 12 20Z" />
    </Icon>
  );
}

export function BagIcon() {
  return (
    <Icon>
      <path d="M5 8H19L20 20H4Z" />
      <path d="M9 8V6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8" />
    </Icon>
  );
}

export function SwordIcon() {
  return (
    <Icon>
      <path d="M4 20L20 4M4 4L20 20" />
      <path d="M7.2 13.2L10.8 16.8M13.2 16.8L16.8 13.2" strokeWidth="2.75" />
    </Icon>
  );
}

/** A large sparkle plus a small companion sparkle — reads as "magic" at a glance. */
export function SparklesIcon() {
  return (
    <Icon>
      <path d="M10 4L11.4 8.6L16 10L11.4 11.4L10 16L8.6 11.4L4 10L8.6 8.6Z" />
      <path d="M18 4L18.7 6.3L21 7L18.7 7.7L18 10L17.3 7.7L15 7L17.3 6.3Z" />
    </Icon>
  );
}

export function GearIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5V5.5M12 18.5V21.5M21.5 12H18.5M5.5 12H2.5M18.7 5.3L16.6 7.4M7.4 16.6L5.3 18.7M18.7 18.7L16.6 16.6M7.4 7.4L5.3 5.3" />
    </Icon>
  );
}

export function AlertTriangleIcon() {
  return (
    <Icon>
      <path d="M12 4L2.5 20H21.5Z" />
      <path d="M12 10V14" />
      <path d="M12 17.3V17.4" />
    </Icon>
  );
}

export function SparkleIcon() {
  return (
    <Icon>
      <path d="M12 3L13.6 8.4L19 10L13.6 11.6L12 17L10.4 11.6L5 10L10.4 8.4Z" />
    </Icon>
  );
}

export function FlaskIcon() {
  return (
    <Icon>
      <path d="M9 3H15" />
      <path d="M10 3V9L4.7 18.4C4.1 19.5 4.9 21 6.2 21H17.8C19.1 21 19.9 19.5 19.3 18.4L14 9V3" />
      <path d="M7 15H17" />
    </Icon>
  );
}

export function BookmarkIcon() {
  return (
    <Icon>
      <path d="M6 3H18V21L12 17L6 21Z" />
    </Icon>
  );
}

export function DropletIcon() {
  return (
    <Icon>
      <path d="M12 3C12 3 5 11 5 15.5C5 18.5 8.5 21 12 21C15.5 21 19 18.5 19 15.5C19 11 12 3 12 3Z" />
    </Icon>
  );
}

export function TrendingUpIcon() {
  return (
    <Icon>
      <path d="M3 17L9 11L13 15L21 6" />
      <path d="M21 6H15M21 6V12" />
    </Icon>
  );
}

export function LaurelIcon() {
  return (
    <Icon>
      <path d="M12 20C8 18.5 5 15 5 10C5 8.5 5.4 7 6 6" />
      <path d="M12 20C16 18.5 19 15 19 10C19 8.5 18.6 7 18 6" />
      <path d="M6.3 8.2L4.6 8.7M7.3 11.5L5.4 12.3M8.8 14.5L7 15.7" />
      <path d="M17.7 8.2L19.4 8.7M16.7 11.5L18.6 12.3M15.2 14.5L17 15.7" />
    </Icon>
  );
}

export function RibbonIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="5" />
      <path d="M8 12.5L6 21L12 18L18 21L16 12.5" />
    </Icon>
  );
}

export function PawIcon() {
  return (
    <Icon>
      <ellipse cx="12" cy="16.5" rx="5" ry="4" />
      <circle cx="4.5" cy="9.5" r="2" />
      <circle cx="9.5" cy="5.5" r="2" />
      <circle cx="14.5" cy="5.5" r="2" />
      <circle cx="19.5" cy="9.5" r="2" />
    </Icon>
  );
}

export function BirdIcon() {
  return (
    <Icon>
      <path d="M3 14C5.5 10.5 8 10.5 9.5 13C11 10.5 13.5 10.5 15 13C16.5 10.5 19 10.5 21 14" />
    </Icon>
  );
}

export function EyeIcon() {
  return (
    <Icon>
      <path d="M2 12C4.5 7 8 4.5 12 4.5C16 4.5 19.5 7 22 12C19.5 17 16 19.5 12 19.5C8 19.5 4.5 17 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function GhostIcon() {
  return (
    <Icon>
      <path d="M5 20V11C5 6.5 8.5 3 12 3C15.5 3 19 6.5 19 11V20L16.5 18L14 20L12 18L10 20L7.5 18Z" />
      <circle cx="9.5" cy="10.5" r="1" />
      <circle cx="14.5" cy="10.5" r="1" />
    </Icon>
  );
}

export function CandleIcon() {
  return (
    <Icon>
      <path d="M9 10H15V21H9Z" />
      <path d="M12 10V4.5" />
      <path d="M12 4.5C11 4.5 10.2 3.3 12 1.5C13.8 3.3 13 4.5 12 4.5Z" />
    </Icon>
  );
}

export function SwapIcon() {
  return (
    <Icon>
      <path d="M4 8H18M18 8L14 4M18 8L14 12" />
      <path d="M20 16H6M6 16L10 12M6 16L10 20" />
    </Icon>
  );
}

export function ClawIcon() {
  return (
    <Icon>
      <path d="M5 5L9 19M12 4L14 20M19 5L15 19" />
    </Icon>
  );
}

export function MaskIcon() {
  return (
    <Icon>
      <path d="M3 9C3 9 6 7 12 7C18 7 21 9 21 9C21 13 18.5 16 15.5 16C13.5 16 13 14 12 14C11 14 10.5 16 8.5 16C5.5 16 3 13 3 9Z" />
      <circle cx="8" cy="10.5" r="1.2" />
      <circle cx="16" cy="10.5" r="1.2" />
    </Icon>
  );
}

export function ChevronUpIcon() {
  return (
    <Icon>
      <path d="M5 15L12 8L19 15" />
    </Icon>
  );
}

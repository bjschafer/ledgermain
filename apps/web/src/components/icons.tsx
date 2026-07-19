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
      <path d="M2 9V15M4 7V17M8 11V13M20 9V15M18 7V17M16 11V13M8 12H16" />
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
      <path d="M14 4L20 10L10.5 19.5L5 21L6.5 15.5Z" />
      <path d="M4 20L7 17" />
      <path d="M12.5 6L15 3M18 9L21 6.5" />
    </Icon>
  );
}

export function WandIcon() {
  return (
    <Icon>
      <path d="M4 20L15.5 8.5" />
      <path d="M18 3L18.9 5.1L21 6L18.9 6.9L18 9L17.1 6.9L15 6L17.1 5.1Z" />
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

export function DashboardIcon({ children, size = 16, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function OverviewIcon() {
  return (
    <DashboardIcon>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </DashboardIcon>
  );
}

export function PipelineIcon() {
  return (
    <DashboardIcon>
      <path d="M3 6h18" />
      <path d="M6 12h12" />
      <path d="M9 18h6" />
    </DashboardIcon>
  );
}

export function CalendarIcon() {
  return (
    <DashboardIcon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </DashboardIcon>
  );
}

export function SheetIcon() {
  return (
    <DashboardIcon>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M4 10h16" />
    </DashboardIcon>
  );
}

export function DealsIcon() {
  return (
    <DashboardIcon>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
    </DashboardIcon>
  );
}

export function OfficeIcon() {
  return (
    <DashboardIcon>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-5h6v5" />
      <path d="M8 10h.01" />
      <path d="M8 13h.01" />
      <path d="M12 10h.01" />
      <path d="M12 13h.01" />
      <path d="M16 10h.01" />
      <path d="M16 13h.01" />
    </DashboardIcon>
  );
}

export function PeopleIcon() {
  return (
    <DashboardIcon>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-3 2.9-5 5.5-5s4.9 2 5.5 5" />
      <path d="M16 7a3 3 0 0 1 0 6" />
      <path d="M18.5 19a5.6 5.6 0 0 0-3-4.2" />
    </DashboardIcon>
  );
}

export function AnalyticsIcon() {
  return (
    <DashboardIcon>
      <path d="M4 19h16" />
      <path d="M7 16v-5" />
      <path d="M12 16V7" />
      <path d="M17 16v-8" />
    </DashboardIcon>
  );
}

export function ActivityIcon() {
  return (
    <DashboardIcon>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </DashboardIcon>
  );
}

export function InboxIcon() {
  return (
    <DashboardIcon>
      <path d="M3 13l3-8h12l3 8" />
      <path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6" />
      <path d="M3 13h5l1 3h6l1-3h5" />
    </DashboardIcon>
  );
}

export function SettingsIcon() {
  return (
    <DashboardIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 3.4 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L3.2 7A2 2 0 1 1 6 4.2l.1.1a1.7 1.7 0 0 0 1.8.3H8a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </DashboardIcon>
  );
}

export function SearchIcon() {
  return (
    <DashboardIcon>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </DashboardIcon>
  );
}

export function MenuIcon() {
  return (
    <DashboardIcon>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </DashboardIcon>
  );
}

export function BellIcon() {
  return (
    <DashboardIcon>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </DashboardIcon>
  );
}

export function MailIcon() {
  return (
    <DashboardIcon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </DashboardIcon>
  );
}

export function GlobeIcon() {
  return (
    <DashboardIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </DashboardIcon>
  );
}

export function PhoneIcon() {
  return (
    <DashboardIcon>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.9a2 2 0 0 1-.6 1.8L7.1 10a16 16 0 0 0 6.9 6.9l1.6-1.8a2 2 0 0 1 1.8-.6l2.9.4a2 2 0 0 1 1.7 2Z" />
    </DashboardIcon>
  );
}

export function LinkedInIcon() {
  return (
    <DashboardIcon>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10v7" />
      <path d="M8 7.5h.01" />
      <path d="M12 17v-4.2a2 2 0 0 1 4 0V17" />
      <path d="M12 10v7" />
    </DashboardIcon>
  );
}

export function PlusIcon() {
  return (
    <DashboardIcon>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </DashboardIcon>
  );
}

export function DownloadIcon() {
  return (
    <DashboardIcon>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M4 20h16" />
    </DashboardIcon>
  );
}

export function ArrowUpIcon() {
  return (
    <DashboardIcon size={12}>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </DashboardIcon>
  );
}

export function ClipboardIcon() {
  return (
    <DashboardIcon size={34} className="">
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M9 4.5h6" />
    </DashboardIcon>
  );
}

export function EditIcon() {
  return (
    <DashboardIcon>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z" />
    </DashboardIcon>
  );
}

export function TrashIcon() {
  return (
    <DashboardIcon>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </DashboardIcon>
  );
}

export function CheckIcon() {
  return (
    <DashboardIcon>
      <path d="m5 12 4 4L19 6" />
    </DashboardIcon>
  );
}

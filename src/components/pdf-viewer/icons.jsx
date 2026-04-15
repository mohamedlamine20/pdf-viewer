function IconBase({ children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function FileIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </IconBase>
  );
}

export function UploadIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </IconBase>
  );
}

export function LinkIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19" />
    </IconBase>
  );
}

export function SearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

export function ChevronRightIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

export function ZoomInIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function ZoomOutIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M8 11h6" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function FitWidthIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 7h18" />
      <path d="M3 17h18" />
      <path d="M8 7v10" />
      <path d="M16 7v10" />
      <path d="m5 12-2 0" />
      <path d="m21 12-2 0" />
    </IconBase>
  );
}

export function FitPageIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 4h12v16H6z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </IconBase>
  );
}

export function RotateIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 11a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v7h-7" />
    </IconBase>
  );
}

export function SidebarIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </IconBase>
  );
}

export function PanelRightIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </IconBase>
  );
}

export function DownloadIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M4 20h16" />
    </IconBase>
  );
}

export function PrintIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 9V4h12v5" />
      <rect x="6" y="14" width="12" height="6" rx="1" />
      <path d="M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" />
    </IconBase>
  );
}

export function FullscreenIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M21 16v5h-5" />
      <path d="M3 16v5h5" />
    </IconBase>
  );
}

export function OpenInNewIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </IconBase>
  );
}

export function SunIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </IconBase>
  );
}

export function MoonIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </IconBase>
  );
}

export function BookmarksIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2z" />
      <path d="M9 8h6" />
      <path d="M9 12h5" />
    </IconBase>
  );
}

export function CloseIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}

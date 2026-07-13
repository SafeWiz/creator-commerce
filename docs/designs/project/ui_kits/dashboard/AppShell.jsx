// AppShell — dashboard sidebar + topbar chrome. Exposes window.AppShell + window.Icon.
const { useState, useEffect, useRef } = React;

// Lucide icon component (uses UMD global). Static name → safe with React diffing.
function Icon({ name, size = 16, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !window.lucide) return;
    const node = (window.lucide.icons || {})[toPascal(name)];
    host.innerHTML = "";
    if (node && window.lucide.createElement) {
      const svg = window.lucide.createElement(node);
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
      svg.style.display = "block";
      host.appendChild(svg);
    }
  }, [name, size]);
  return <span ref={ref} style={{ display: "inline-flex", alignItems: "center", ...style }} />;
}
function toPascal(s) {
  return s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
}

const NAV = [
  { section: null, items: [{ id: "dashboard", label: "Dashboard", icon: "layout-dashboard" }] },
  { section: "Selling", items: [
    { id: "products", label: "Products", icon: "package" },
    { id: "sales", label: "Sales", icon: "trending-up" },
  ]},
  { section: "Buying", items: [
    { id: "purchases", label: "Purchases", icon: "receipt" },
    { id: "downloads", label: "Downloads", icon: "download" },
    { id: "wishlist", label: "Wishlist", icon: "heart" },
  ]},
];
const FOOTER_NAV = [
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "help", label: "Help", icon: "circle-help" },
];

function AppShell({ current, onNavigate, title, actions, children }) {
  const d = window.CC_DATA;
  const [open, setOpen] = useState(true);

  const NavButton = ({ item }) => {
    const active = current === item.id;
    return (
      <button
        onClick={() => onNavigate(item.id)}
        title={item.label}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          height: 32, padding: "0 8px", border: 0, cursor: "pointer",
          borderRadius: "var(--radius-md)", textAlign: "left",
          fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
          fontWeight: active ? 500 : 400,
          background: active ? "var(--sidebar-accent)" : "transparent",
          color: active ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
          justifyContent: open ? "flex-start" : "center",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--sidebar-accent)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
      >
        <Icon name={item.icon} />
        {open && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--background)", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
      {/* Sidebar */}
      <aside style={{
        width: open ? "var(--sidebar-width)" : "var(--sidebar-width-icon)",
        flexShrink: 0, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)",
        display: "flex", flexDirection: "column", transition: "width .2s ease",
      }}>
        {/* Brand */}
        <div style={{ height: "var(--topbar-h)", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderBottom: "1px solid var(--sidebar-border)" }}>
          <svg width="26" height="26" viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}><path d="M28 12 A12 12 0 1 0 28 36" stroke="var(--foreground)" strokeWidth="4.5" strokeLinecap="round" fill="none"/><path d="M32 16 A12 12 0 1 1 32 32" stroke="var(--primary)" strokeWidth="4.5" strokeLinecap="round" fill="none"/></svg>
          {open && <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15, letterSpacing: "-0.02em" }}>Creator<b style={{ fontWeight: 700 }}>Commerce</b></span>}
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, overflow: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((grp, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: grp.section ? 10 : 0 }}>
              {grp.section && open && (
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "color-mix(in oklch,var(--sidebar-foreground),transparent 45%)", padding: "0 8px", height: 24, display: "flex", alignItems: "center" }}>{grp.section}</div>
              )}
              {grp.items.map((it) => <NavButton key={it.id} item={it} />)}
            </div>
          ))}
        </nav>
        {/* Footer nav + user */}
        <div style={{ padding: 8, borderTop: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", gap: 2 }}>
          {FOOTER_NAV.map((it) => <NavButton key={it.id} item={it} />)}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginTop: 4 }}>
            <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 9999, background: "var(--olive-200)", color: "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{d.user.initials}</span>
            {open && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.user.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>{d.user.handle}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ height: "var(--topbar-h)", flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--background)" }}>
          <button onClick={() => setOpen((o) => !o)} title="Toggle sidebar" style={{ width: 28, height: 28, border: 0, background: "transparent", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--muted)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <Icon name="panel-left" />
          </button>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15, letterSpacing: "-0.01em" }}>{title}</div>
          <div style={{ flex: 1 }} />
          {actions}
        </header>
        <main style={{ flex: 1, overflow: "auto", background: "var(--background)" }}>{children}</main>
      </div>
    </div>
  );
}

Object.assign(window, { AppShell, Icon });

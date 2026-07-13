import React from "react";

const CSS = `
.cc-badge{
  display:inline-flex;align-items:center;justify-content:center;gap:.25rem;
  width:fit-content;height:1.25rem;padding:.125rem .5rem;
  border:1px solid transparent;border-radius:var(--radius-4xl);
  font-family:var(--font-sans);font-size:var(--text-xs);font-weight:var(--weight-medium);line-height:1;white-space:nowrap;
  overflow:hidden;
}
.cc-badge svg{width:.75rem;height:.75rem;}
.cc-badge--default{background:var(--primary);color:var(--primary-foreground);}
.cc-badge--secondary{background:var(--secondary);color:var(--secondary-foreground);}
.cc-badge--destructive{background:color-mix(in oklch,var(--destructive),transparent 90%);color:var(--destructive);}
.cc-badge--outline{border-color:var(--border);color:var(--foreground);background:transparent;}
.cc-badge--ghost{color:var(--muted-foreground);background:transparent;}
/* dot for status */
.cc-badge__dot{width:.375rem;height:.375rem;border-radius:9999px;background:currentColor;}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-badge-css")) {
  const el = document.createElement("style");
  el.id = "cc-badge-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Badge({ variant = "default", dot = false, className = "", children, ...props }) {
  return (
    <span data-slot="badge" className={`cc-badge cc-badge--${variant} ${className}`.trim()} {...props}>
      {dot ? <span className="cc-badge__dot" /> : null}
      {children}
    </span>
  );
}

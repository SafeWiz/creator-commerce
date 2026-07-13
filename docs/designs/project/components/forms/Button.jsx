import React from "react";

/* Inject component CSS once. Tokens come from styles.css (linked by the host). */
const CSS = `
.cc-btn{
  --cc-btn-h:var(--control-h);
  display:inline-flex;align-items:center;justify-content:center;gap:.375rem;
  flex-shrink:0;white-space:nowrap;user-select:none;cursor:pointer;
  height:var(--cc-btn-h);padding:0 .625rem;
  border:1px solid transparent;border-radius:var(--radius-lg);
  font-family:var(--font-sans);font-size:var(--text-sm);font-weight:var(--weight-medium);line-height:1;
  transition:background-color .15s ease,color .15s ease,box-shadow .15s ease,border-color .15s ease,transform .05s ease;
  outline:none;
}
.cc-btn:focus-visible{border-color:var(--ring);box-shadow:var(--focus-ring);}
.cc-btn:active:not(:disabled){transform:translateY(1px);}
.cc-btn:disabled{pointer-events:none;opacity:.5;}
.cc-btn svg{width:1rem;height:1rem;flex-shrink:0;pointer-events:none;}

/* sizes */
.cc-btn--xs{height:var(--control-h-xs);padding:0 .5rem;font-size:var(--text-xs);border-radius:var(--radius-md);gap:.25rem;}
.cc-btn--xs svg{width:.75rem;height:.75rem;}
.cc-btn--sm{height:var(--control-h-sm);padding:0 .625rem;font-size:.8rem;border-radius:var(--radius-md);}
.cc-btn--sm svg{width:.875rem;height:.875rem;}
.cc-btn--lg{height:var(--control-h-lg);padding:0 .625rem;}
.cc-btn--icon{width:var(--control-h);padding:0;}
.cc-btn--icon-sm{width:var(--control-h-sm);height:var(--control-h-sm);padding:0;border-radius:var(--radius-md);}
.cc-btn--icon-lg{width:var(--control-h-lg);height:var(--control-h-lg);padding:0;}

/* variants */
.cc-btn--default{background:var(--primary);color:var(--primary-foreground);}
.cc-btn--default:hover:not(:disabled){background:color-mix(in oklch,var(--primary),transparent 20%);}
.cc-btn--outline{border-color:var(--border);background:var(--background);color:var(--foreground);}
.cc-btn--outline:hover:not(:disabled){background:var(--muted);}
.cc-btn--secondary{background:var(--secondary);color:var(--secondary-foreground);}
.cc-btn--secondary:hover:not(:disabled){background:color-mix(in oklch,var(--secondary),var(--foreground) 5%);}
.cc-btn--ghost{background:transparent;color:var(--foreground);}
.cc-btn--ghost:hover:not(:disabled){background:var(--muted);}
.cc-btn--destructive{background:color-mix(in oklch,var(--destructive),transparent 90%);color:var(--destructive);}
.cc-btn--destructive:hover:not(:disabled){background:color-mix(in oklch,var(--destructive),transparent 80%);}
.cc-btn--link{background:transparent;color:var(--primary);height:auto;padding:0;border-radius:0;}
.cc-btn--link:hover:not(:disabled){text-decoration:underline;text-underline-offset:4px;}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-button-css")) {
  const el = document.createElement("style");
  el.id = "cc-button-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Button({
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}) {
  const sizeClass = size === "default" ? "" : `cc-btn--${size}`;
  return (
    <button
      data-slot="button"
      className={`cc-btn cc-btn--${variant} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

import React from "react";

const CSS = `
.cc-tooltip{position:relative;display:inline-flex;}
.cc-tooltip__pop{
  position:absolute;z-index:50;left:50%;transform:translateX(-50%) translateY(-4px);
  bottom:calc(100% + 6px);
  display:inline-flex;align-items:center;gap:.375rem;width:max-content;max-width:18rem;
  padding:.375rem .75rem;border-radius:var(--radius-md);
  background:var(--foreground);color:var(--background);
  font-family:var(--font-sans);font-size:var(--text-xs);line-height:1.3;
  box-shadow:var(--shadow);
  opacity:0;pointer-events:none;transition:opacity .12s ease,transform .12s ease;
}
.cc-tooltip__pop::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%) rotate(45deg) translateY(-3px);width:.5rem;height:.5rem;background:var(--foreground);border-radius:2px;}
.cc-tooltip:hover .cc-tooltip__pop,.cc-tooltip:focus-within .cc-tooltip__pop{opacity:1;transform:translateX(-50%) translateY(0);}
.cc-tooltip__pop[data-side="bottom"]{bottom:auto;top:calc(100% + 6px);transform:translateX(-50%) translateY(4px);}
.cc-tooltip__pop[data-side="bottom"]::after{top:auto;bottom:100%;transform:translateX(-50%) rotate(45deg) translateY(3px);}
.cc-tooltip:hover .cc-tooltip__pop[data-side="bottom"],.cc-tooltip:focus-within .cc-tooltip__pop[data-side="bottom"]{transform:translateX(-50%) translateY(0);}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-tooltip-css")) {
  const el = document.createElement("style");
  el.id = "cc-tooltip-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Tooltip({ content, side = "top", className = "", children, ...props }) {
  return (
    <span data-slot="tooltip" className={`cc-tooltip ${className}`.trim()} tabIndex={0} {...props}>
      {children}
      <span className="cc-tooltip__pop" data-side={side} role="tooltip">{content}</span>
    </span>
  );
}

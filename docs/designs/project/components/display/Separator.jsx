import React from "react";

const CSS = `
.cc-separator{flex-shrink:0;background:var(--border);border:0;}
.cc-separator[data-orientation="horizontal"]{height:1px;width:100%;}
.cc-separator[data-orientation="vertical"]{width:1px;align-self:stretch;min-height:1rem;}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-separator-css")) {
  const el = document.createElement("style");
  el.id = "cc-separator-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Separator({ orientation = "horizontal", className = "", ...props }) {
  return (
    <div
      data-slot="separator"
      role="separator"
      aria-orientation={orientation}
      data-orientation={orientation}
      className={`cc-separator ${className}`.trim()}
      {...props}
    />
  );
}

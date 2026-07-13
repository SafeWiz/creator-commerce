import React from "react";

const CSS = `
@keyframes cc-pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
.cc-skeleton{background:var(--muted);border-radius:var(--radius-md);animation:cc-pulse 1.6s cubic-bezier(.4,0,.6,1) infinite;}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-skeleton-css")) {
  const el = document.createElement("style");
  el.id = "cc-skeleton-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Skeleton({ className = "", style, ...props }) {
  return <div data-slot="skeleton" className={`cc-skeleton ${className}`.trim()} style={style} {...props} />;
}

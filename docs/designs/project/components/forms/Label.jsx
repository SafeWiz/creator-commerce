import React from "react";

const CSS = `
.cc-label{
  display:inline-flex;align-items:center;gap:.5rem;
  font-family:var(--font-sans);font-size:var(--text-sm);font-weight:var(--weight-medium);
  line-height:1;color:var(--foreground);user-select:none;
}
.cc-label[data-disabled="true"]{pointer-events:none;opacity:.5;}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-label-css")) {
  const el = document.createElement("style");
  el.id = "cc-label-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Label({ className = "", disabled = false, children, ...props }) {
  return (
    <label data-slot="label" data-disabled={disabled ? "true" : undefined} className={`cc-label ${className}`.trim()} {...props}>
      {children}
    </label>
  );
}

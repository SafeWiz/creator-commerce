import React from "react";

const CSS = `
.cc-input{
  display:flex;height:var(--control-h);width:100%;min-width:0;
  padding:.25rem .625rem;
  border:1px solid var(--input);border-radius:var(--radius-lg);
  background:transparent;color:var(--foreground);
  font-family:var(--font-sans);font-size:var(--text-sm);line-height:1.4;
  transition:border-color .15s ease,box-shadow .15s ease;
  outline:none;
}
.cc-input::placeholder{color:var(--muted-foreground);}
.cc-input:focus-visible{border-color:var(--ring);box-shadow:var(--focus-ring);}
.cc-input:disabled{pointer-events:none;cursor:not-allowed;opacity:.5;background:color-mix(in oklch,var(--input),transparent 50%);}
.cc-input[aria-invalid="true"]{border-color:var(--destructive);box-shadow:0 0 0 3px color-mix(in oklch,var(--destructive),transparent 80%);}
.cc-input--textarea{height:auto;min-height:5rem;padding:.5rem .625rem;resize:vertical;}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-input-css")) {
  const el = document.createElement("style");
  el.id = "cc-input-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Input({ className = "", asTextarea = false, ...props }) {
  if (asTextarea) {
    return (
      <textarea data-slot="input" className={`cc-input cc-input--textarea ${className}`.trim()} {...props} />
    );
  }
  return <input data-slot="input" className={`cc-input ${className}`.trim()} {...props} />;
}

import React from "react";

const CSS = `
.cc-card{
  display:flex;flex-direction:column;gap:var(--card-spacing);
  padding:var(--card-spacing) 0;
  background:var(--card);color:var(--card-foreground);
  border-radius:var(--radius-xl);
  box-shadow:var(--ring-card);
  overflow:hidden;
  font-family:var(--font-sans);font-size:var(--text-sm);
}
.cc-card[data-size="sm"]{--card-spacing:var(--card-spacing-sm);}
.cc-card > img:first-child{border-top-left-radius:var(--radius-xl);border-top-right-radius:var(--radius-xl);}
.cc-card > img{display:block;width:100%;}
.cc-card:has(.cc-card-footer){padding-bottom:0;}

.cc-card-header{display:grid;grid-auto-rows:min-content;align-items:start;gap:.25rem;padding:0 var(--card-spacing);}
.cc-card-header.has-action{grid-template-columns:1fr auto;}
.cc-card-title{font-family:var(--font-heading);font-size:var(--text-base);font-weight:var(--weight-medium);line-height:var(--leading-snug);letter-spacing:var(--tracking-tight);}
.cc-card[data-size="sm"] .cc-card-title{font-size:var(--text-sm);}
.cc-card-description{font-size:var(--text-sm);color:var(--muted-foreground);line-height:var(--leading-normal);}
.cc-card-action{grid-column:2;grid-row:span 2;align-self:start;justify-self:end;}
.cc-card-content{padding:0 var(--card-spacing);}
.cc-card-footer{display:flex;align-items:center;gap:.5rem;padding:var(--card-spacing);border-top:1px solid var(--border);background:color-mix(in oklch,var(--muted),transparent 50%);border-bottom-left-radius:var(--radius-xl);border-bottom-right-radius:var(--radius-xl);}
`;
if (typeof document !== "undefined" && !document.getElementById("cc-card-css")) {
  const el = document.createElement("style");
  el.id = "cc-card-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Card({ size = "default", className = "", children, ...props }) {
  return (
    <div data-slot="card" data-size={size} className={`cc-card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  const hasAction = React.Children.toArray(children).some(
    (c) => React.isValidElement(c) && c.type === CardAction
  );
  return (
    <div data-slot="card-header" className={`cc-card-header ${hasAction ? "has-action" : ""} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }) {
  return <div data-slot="card-title" className={`cc-card-title ${className}`.trim()} {...props}>{children}</div>;
}

export function CardDescription({ className = "", children, ...props }) {
  return <div data-slot="card-description" className={`cc-card-description ${className}`.trim()} {...props}>{children}</div>;
}

export function CardAction({ className = "", children, ...props }) {
  return <div data-slot="card-action" className={`cc-card-action ${className}`.trim()} {...props}>{children}</div>;
}

export function CardContent({ className = "", children, ...props }) {
  return <div data-slot="card-content" className={`cc-card-content ${className}`.trim()} {...props}>{children}</div>;
}

export function CardFooter({ className = "", children, ...props }) {
  return <div data-slot="card-footer" className={`cc-card-footer ${className}`.trim()} {...props}>{children}</div>;
}

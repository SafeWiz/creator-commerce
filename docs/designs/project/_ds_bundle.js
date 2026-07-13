/* @ds-bundle: {"format":4,"namespace":"CreatorCommerceDesignSystem_0c16ec","components":[{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"CardHeader","sourcePath":"components/display/Card.jsx"},{"name":"CardTitle","sourcePath":"components/display/Card.jsx"},{"name":"CardDescription","sourcePath":"components/display/Card.jsx"},{"name":"CardAction","sourcePath":"components/display/Card.jsx"},{"name":"CardContent","sourcePath":"components/display/Card.jsx"},{"name":"CardFooter","sourcePath":"components/display/Card.jsx"},{"name":"Separator","sourcePath":"components/display/Separator.jsx"},{"name":"Skeleton","sourcePath":"components/display/Skeleton.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Label","sourcePath":"components/forms/Label.jsx"},{"name":"Tooltip","sourcePath":"components/overlay/Tooltip.jsx"}],"sourceHashes":{"components/display/Badge.jsx":"b140bc4f7316","components/display/Card.jsx":"86fcc91e2aaf","components/display/Separator.jsx":"0821a9885a6a","components/display/Skeleton.jsx":"d316c4942d7b","components/forms/Button.jsx":"ffbaaa3952c5","components/forms/Input.jsx":"7b0283bfd5f6","components/forms/Label.jsx":"59ef3542936f","components/overlay/Tooltip.jsx":"3a9f6666e2e5","ui_kits/dashboard/AppShell.jsx":"177628521683","ui_kits/dashboard/DashboardScreen.jsx":"40bada58ad54","ui_kits/dashboard/ProductEditScreen.jsx":"5682093f9ec2","ui_kits/dashboard/ProductsScreen.jsx":"b2bbb82b5a23","ui_kits/dashboard/data.js":"43ecd1b0a449"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CreatorCommerceDesignSystem_0c16ec = window.CreatorCommerceDesignSystem_0c16ec || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Badge({
  variant = "default",
  dot = false,
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    "data-slot": "badge",
    className: `cc-badge cc-badge--${variant} ${className}`.trim()
  }, props), dot ? /*#__PURE__*/React.createElement("span", {
    className: "cc-badge__dot"
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Card({
  size = "default",
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "card",
    "data-size": size,
    className: `cc-card ${className}`.trim()
  }, props), children);
}
function CardHeader({
  className = "",
  children,
  ...props
}) {
  const hasAction = React.Children.toArray(children).some(c => React.isValidElement(c) && c.type === CardAction);
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "card-header",
    className: `cc-card-header ${hasAction ? "has-action" : ""} ${className}`.trim()
  }, props), children);
}
function CardTitle({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "card-title",
    className: `cc-card-title ${className}`.trim()
  }, props), children);
}
function CardDescription({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "card-description",
    className: `cc-card-description ${className}`.trim()
  }, props), children);
}
function CardAction({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "card-action",
    className: `cc-card-action ${className}`.trim()
  }, props), children);
}
function CardContent({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "card-content",
    className: `cc-card-content ${className}`.trim()
  }, props), children);
}
function CardFooter({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "card-footer",
    className: `cc-card-footer ${className}`.trim()
  }, props), children);
}
Object.assign(__ds_scope, { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Separator.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Separator({
  orientation = "horizontal",
  className = "",
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "separator",
    role: "separator",
    "aria-orientation": orientation,
    "data-orientation": orientation,
    className: `cc-separator ${className}`.trim()
  }, props));
}
Object.assign(__ds_scope, { Separator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Separator.jsx", error: String((e && e.message) || e) }); }

// components/display/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Skeleton({
  className = "",
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "data-slot": "skeleton",
    className: `cc-skeleton ${className}`.trim(),
    style: style
  }, props));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Button({
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}) {
  const sizeClass = size === "default" ? "" : `cc-btn--${size}`;
  return /*#__PURE__*/React.createElement("button", _extends({
    "data-slot": "button",
    className: `cc-btn cc-btn--${variant} ${sizeClass} ${className}`.trim()
  }, props), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Input({
  className = "",
  asTextarea = false,
  ...props
}) {
  if (asTextarea) {
    return /*#__PURE__*/React.createElement("textarea", _extends({
      "data-slot": "input",
      className: `cc-input cc-input--textarea ${className}`.trim()
    }, props));
  }
  return /*#__PURE__*/React.createElement("input", _extends({
    "data-slot": "input",
    className: `cc-input ${className}`.trim()
  }, props));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Label.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Label({
  className = "",
  disabled = false,
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    "data-slot": "label",
    "data-disabled": disabled ? "true" : undefined,
    className: `cc-label ${className}`.trim()
  }, props), children);
}
Object.assign(__ds_scope, { Label });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Label.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Tooltip({
  content,
  side = "top",
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    "data-slot": "tooltip",
    className: `cc-tooltip ${className}`.trim(),
    tabIndex: 0
  }, props), children, /*#__PURE__*/React.createElement("span", {
    className: "cc-tooltip__pop",
    "data-side": side,
    role: "tooltip"
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/AppShell.jsx
try { (() => {
// AppShell — dashboard sidebar + topbar chrome. Exposes window.AppShell + window.Icon.
const {
  useState,
  useEffect,
  useRef
} = React;

// Lucide icon component (uses UMD global). Static name → safe with React diffing.
function Icon({
  name,
  size = 16,
  style
}) {
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
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      alignItems: "center",
      ...style
    }
  });
}
function toPascal(s) {
  return s.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join("");
}
const NAV = [{
  section: null,
  items: [{
    id: "dashboard",
    label: "Dashboard",
    icon: "layout-dashboard"
  }]
}, {
  section: "Selling",
  items: [{
    id: "products",
    label: "Products",
    icon: "package"
  }, {
    id: "sales",
    label: "Sales",
    icon: "trending-up"
  }]
}, {
  section: "Buying",
  items: [{
    id: "purchases",
    label: "Purchases",
    icon: "receipt"
  }, {
    id: "downloads",
    label: "Downloads",
    icon: "download"
  }, {
    id: "wishlist",
    label: "Wishlist",
    icon: "heart"
  }]
}];
const FOOTER_NAV = [{
  id: "settings",
  label: "Settings",
  icon: "settings"
}, {
  id: "help",
  label: "Help",
  icon: "circle-help"
}];
function AppShell({
  current,
  onNavigate,
  title,
  actions,
  children
}) {
  const d = window.CC_DATA;
  const [open, setOpen] = useState(true);
  const NavButton = ({
    item
  }) => {
    const active = current === item.id;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => onNavigate(item.id),
      title: item.label,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        height: 32,
        padding: "0 8px",
        border: 0,
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        textAlign: "left",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: active ? 500 : 400,
        background: active ? "var(--sidebar-accent)" : "transparent",
        color: active ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
        justifyContent: open ? "flex-start" : "center"
      },
      onMouseEnter: e => {
        if (!active) e.currentTarget.style.background = "var(--sidebar-accent)";
      },
      onMouseLeave: e => {
        if (!active) e.currentTarget.style.background = "transparent";
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: item.icon
    }), open && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, item.label));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100%",
      background: "var(--background)",
      color: "var(--foreground)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: open ? "var(--sidebar-width)" : "var(--sidebar-width-icon)",
      flexShrink: 0,
      background: "var(--sidebar)",
      borderRight: "1px solid var(--sidebar-border)",
      display: "flex",
      flexDirection: "column",
      transition: "width .2s ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "var(--topbar-h)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 12px",
      borderBottom: "1px solid var(--sidebar-border)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 48 48",
    fill: "none",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M28 12 A12 12 0 1 0 28 36",
    stroke: "var(--foreground)",
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 16 A12 12 0 1 1 32 32",
    stroke: "var(--primary)",
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  })), open && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-heading)",
      fontWeight: 500,
      fontSize: 15,
      letterSpacing: "-0.02em"
    }
  }, "Creator", /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 700
    }
  }, "Commerce"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      overflow: "auto",
      padding: 8,
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, NAV.map((grp, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      marginTop: grp.section ? 10 : 0
    }
  }, grp.section && open && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "color-mix(in oklch,var(--sidebar-foreground),transparent 45%)",
      padding: "0 8px",
      height: 24,
      display: "flex",
      alignItems: "center"
    }
  }, grp.section), grp.items.map(it => /*#__PURE__*/React.createElement(NavButton, {
    key: it.id,
    item: it
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderTop: "1px solid var(--sidebar-border)",
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, FOOTER_NAV.map(it => /*#__PURE__*/React.createElement(NavButton, {
    key: it.id,
    item: it
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 8px",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      flexShrink: 0,
      borderRadius: 9999,
      background: "var(--olive-200)",
      color: "var(--foreground)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700
    }
  }, d.user.initials), open && /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, d.user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted-foreground)",
      fontFamily: "var(--font-mono)"
    }
  }, d.user.handle))))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: "var(--topbar-h)",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "0 16px",
      borderBottom: "1px solid var(--border)",
      background: "var(--background)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    title: "Toggle sidebar",
    style: {
      width: 28,
      height: 28,
      border: 0,
      background: "transparent",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--foreground)"
    },
    onMouseEnter: e => e.currentTarget.style.background = "var(--muted)",
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "panel-left"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-heading)",
      fontWeight: 500,
      fontSize: 15,
      letterSpacing: "-0.01em"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), actions), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflow: "auto",
      background: "var(--background)"
    }
  }, children)));
}
Object.assign(window, {
  AppShell,
  Icon
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DashboardScreen.jsx
try { (() => {
// DashboardScreen — Overview: KPI tiles, top products, onboarding checklist.
function DashboardScreen({
  NS
}) {
  const {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    CardAction,
    Badge,
    Button,
    Separator
  } = NS;
  const d = window.CC_DATA;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      maxWidth: 1120,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-heading)",
      fontWeight: 500,
      fontSize: 24,
      letterSpacing: "-0.02em",
      margin: 0
    }
  }, "Welcome back, Gabi"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--muted-foreground)",
      fontSize: 14,
      margin: "4px 0 0"
    }
  }, "Here's how your storefront is doing.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16
    }
  }, d.kpis.map(k => /*#__PURE__*/React.createElement(Card, {
    key: k.label,
    size: "sm"
  }, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardDescription, null, k.label), k.delta && /*#__PURE__*/React.createElement(CardAction, null, /*#__PURE__*/React.createElement(Badge, {
    variant: k.up ? "default" : "destructive"
  }, k.delta))), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 30,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1
    }
  }, k.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted-foreground)",
      marginTop: 4
    }
  }, k.sub))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 16,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Top products"), /*#__PURE__*/React.createElement(CardDescription, null, "By revenue, last 30 days")), /*#__PURE__*/React.createElement(CardContent, {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, d.topProducts.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--muted-foreground)"
    }
  }, p.rev)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: "var(--muted)",
      borderRadius: 9999,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: p.pct + "%",
      height: "100%",
      background: "var(--primary)",
      borderRadius: 9999
    }
  }))))), /*#__PURE__*/React.createElement(CardFooter, null, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm"
  }, "View all sales"))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Get your first sale"), /*#__PURE__*/React.createElement(CardDescription, null, "3 of 5 complete")), /*#__PURE__*/React.createElement(CardContent, {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, d.checklist.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "8px 0",
      borderBottom: i < d.checklist.length - 1 ? "1px solid var(--border)" : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      marginTop: 1,
      flexShrink: 0,
      borderRadius: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: c.done ? "var(--primary)" : "transparent",
      border: c.done ? "0" : "1.5px solid var(--border)",
      color: "var(--primary-foreground)"
    }
  }, c.done && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: c.done ? 400 : 500,
      color: c.done ? "var(--muted-foreground)" : "var(--foreground)",
      textDecoration: c.done ? "line-through" : "none"
    }
  }, c.label), c.sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted-foreground)",
      fontFamily: "var(--font-mono)"
    }
  }, c.sub))))), /*#__PURE__*/React.createElement(CardFooter, null, /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, "Connect Stripe")))));
}
window.DashboardScreen = DashboardScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ProductEditScreen.jsx
try { (() => {
// ProductEditScreen — the product form archetype (RHF + zod + UploadThing + AI).
function ProductEditScreen({
  NS,
  productId,
  onBack
}) {
  const {
    Button,
    Badge,
    Input,
    Label,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Separator,
    Tooltip
  } = NS;
  const d = window.CC_DATA;
  const existing = d.products.find(p => p.id === productId);
  const isNew = productId === "new";
  const fieldRow = {
    display: "flex",
    flexDirection: "column",
    gap: 6
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      maxWidth: 960,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--muted-foreground)",
      fontSize: 13,
      fontFamily: "var(--font-sans)",
      padding: 0,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 15
  }), "Products"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-heading)",
      fontWeight: 500,
      fontSize: 24,
      letterSpacing: "-0.02em",
      margin: 0
    }
  }, isNew ? "New product" : existing?.name), !isNew && /*#__PURE__*/React.createElement(Badge, {
    variant: existing?.status === "Published" ? "default" : "secondary",
    dot: existing?.status === "Draft"
  }, existing?.status), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost"
  }, "Discard"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Save draft"), /*#__PURE__*/React.createElement(Button, null, "Publish"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.5fr 1fr",
      gap: 16,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Details")), /*#__PURE__*/React.createElement(CardContent, {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: fieldRow
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "name"
  }, "Product name"), /*#__PURE__*/React.createElement(Input, {
    id: "name",
    defaultValue: isNew ? "" : existing?.name,
    placeholder: "e.g. Lightroom Preset Pack"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: fieldRow
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "price"
  }, "Price (USD)"), /*#__PURE__*/React.createElement(Input, {
    id: "price",
    defaultValue: isNew ? "" : existing?.price.replace("$", ""),
    placeholder: "29.00"
  })), /*#__PURE__*/React.createElement("div", {
    style: fieldRow
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "slug"
  }, "Slug"), /*#__PURE__*/React.createElement(Input, {
    id: "slug",
    placeholder: "golden-hour-presets"
  }))), /*#__PURE__*/React.createElement("div", {
    style: fieldRow
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "desc"
  }, "Description"), /*#__PURE__*/React.createElement(Input, {
    id: "desc",
    asTextarea: true,
    placeholder: "Describe what buyers get\u2026"
  })))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "AI product page"), /*#__PURE__*/React.createElement(CardDescription, null, "Generate a description & teaser from the uploaded file.")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: "var(--radius-lg)",
      background: "color-mix(in oklch,var(--primary),transparent 94%)",
      border: "1px solid color-mix(in oklch,var(--primary),transparent 80%)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--primary)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13
    }
  }, "Detected a ", /*#__PURE__*/React.createElement("b", null, "ZIP"), " asset. Generate a page draft with an image teaser?"), /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 14
  }), "Generate"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Digital asset")), /*#__PURE__*/React.createElement(CardContent, {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px dashed var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: 20,
      textAlign: "center",
      color: "var(--muted-foreground)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload-cloud",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    }
  }, "Drop a file or ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--primary)",
      fontWeight: 500
    }
  }, "browse")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      marginTop: 4
    }
  }, "ZIP, PDF, audio \xB7 up to 2 GB")), !isNew && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 10px",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-check",
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      flex: 1
    }
  }, "golden-hour-v2.zip"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--muted-foreground)",
      fontFamily: "var(--font-mono)"
    }
  }, "48 MB")))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Cover image")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: "16/10",
      borderRadius: "var(--radius-lg)",
      background: "linear-gradient(135deg, var(--olive-100), var(--olive-200))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--muted-foreground)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "image",
    size: 24
  })))))));
}
window.ProductEditScreen = ProductEditScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ProductEditScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ProductsScreen.jsx
try { (() => {
// ProductsScreen — data table with search, filters, status badges, row actions.
function ProductsScreen({
  NS,
  onEdit
}) {
  const {
    Button,
    Badge,
    Input,
    Tooltip,
    Separator
  } = NS;
  const d = window.CC_DATA;
  const {
    useState
  } = React;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const rows = d.products.filter(p => (filter === "All" || p.status === filter) && p.name.toLowerCase().includes(query.toLowerCase()));
  const th = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--muted-foreground)",
    padding: "0 12px",
    height: 36,
    whiteSpace: "nowrap"
  };
  const td = {
    padding: "0 12px",
    height: 52,
    fontSize: 14,
    borderTop: "1px solid var(--border)",
    verticalAlign: "middle"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      maxWidth: 1120,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-heading)",
      fontWeight: 500,
      fontSize: 24,
      letterSpacing: "-0.02em",
      margin: 0
    }
  }, "Products"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--muted-foreground)",
      fontSize: 14,
      margin: "4px 0 0"
    }
  }, d.products.length, " products \xB7 3 drafts")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    onClick: () => onEdit("new")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "New product")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 280
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 9,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--muted-foreground)",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15
  })), /*#__PURE__*/React.createElement(Input, {
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "Search products\u2026",
    style: {
      paddingLeft: 30
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      background: "var(--muted)",
      padding: 3,
      borderRadius: "var(--radius-lg)"
    }
  }, ["All", "Published", "Draft"].map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setFilter(f),
    style: {
      border: 0,
      cursor: "pointer",
      height: 26,
      padding: "0 12px",
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 500,
      background: filter === f ? "var(--background)" : "transparent",
      color: filter === f ? "var(--foreground)" : "var(--muted-foreground)",
      boxShadow: filter === f ? "var(--ring-card)" : "none"
    }
  }, f)))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--ring-card)",
      overflow: "hidden",
      background: "var(--card)"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Product"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Type"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "Price"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "Sold"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Updated"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      width: 80
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    className: "cc-tr"
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-md)",
      background: "var(--muted)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--muted-foreground)",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: p.type === "PDF" ? "file-text" : p.type === "Audio" ? "audio-lines" : "package",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: 320
    }
  }, p.name))), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "outline"
  }, p.type)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: "right",
      fontFamily: "var(--font-mono)"
    }
  }, p.price), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: "right",
      fontFamily: "var(--font-mono)",
      color: "var(--muted-foreground)"
    }
  }, p.sold), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: p.status === "Published" ? "default" : "secondary",
    dot: p.status === "Draft"
  }, p.status)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      color: "var(--muted-foreground)",
      fontSize: 13
    }
  }, p.updated), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    content: "Edit"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    onClick: () => onEdit(p.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 14
  }))), /*#__PURE__*/React.createElement(Tooltip, {
    content: "Duplicate"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "copy",
    size: 14
  }))))))), rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 7,
    style: {
      ...td,
      textAlign: "center",
      color: "var(--muted-foreground)",
      height: 80
    }
  }, "No products match."))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
      color: "var(--muted-foreground)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Showing ", rows.length, " of ", d.products.length), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    disabled: true
  }, "Previous"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    disabled: true
  }, "Next"))));
}
window.ProductsScreen = ProductsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ProductsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/data.js
try { (() => {
// Mock data for the Creator Commerce dashboard UI kit.
window.CC_DATA = {
  user: {
    name: "Gabi Ionescu",
    handle: "@gabi",
    email: "gabi@example.com",
    initials: "GI"
  },
  kpis: [{
    label: "Revenue",
    value: "$4,280",
    sub: "last 30 days",
    delta: "+12%",
    up: true
  }, {
    label: "Units sold",
    value: "142",
    sub: "last 30 days",
    delta: "+8%",
    up: true
  }, {
    label: "Products",
    value: "14",
    sub: "3 drafts",
    delta: null,
    up: true
  }, {
    label: "Conversion",
    value: "3.1%",
    sub: "storefront",
    delta: "-0.4%",
    up: false
  }],
  checklist: [{
    done: true,
    label: "Create your account"
  }, {
    done: true,
    label: "Claim your handle",
    sub: "creatorcommerce.com/@gabi"
  }, {
    done: true,
    label: "Publish your first product"
  }, {
    done: false,
    label: "Connect Stripe to get paid"
  }, {
    done: false,
    label: "Share your storefront link"
  }],
  products: [{
    id: "p1",
    name: "Lightroom Preset Pack — Golden Hour",
    type: "ZIP",
    price: "$29.00",
    status: "Published",
    sold: 84,
    updated: "2h ago"
  }, {
    id: "p2",
    name: "Notion Freelance OS",
    type: "PDF",
    price: "$19.00",
    status: "Published",
    sold: 41,
    updated: "1d ago"
  }, {
    id: "p3",
    name: "Ambient Loops Vol. 2",
    type: "Audio",
    price: "$12.00",
    status: "Published",
    sold: 17,
    updated: "3d ago"
  }, {
    id: "p4",
    name: "Brand Guidelines Template",
    type: "PDF",
    price: "$24.00",
    status: "Draft",
    sold: 0,
    updated: "5d ago"
  }, {
    id: "p5",
    name: "Icon Set — Outline 240",
    type: "ZIP",
    price: "$15.00",
    status: "Draft",
    sold: 0,
    updated: "1w ago"
  }],
  topProducts: [{
    name: "Golden Hour Presets",
    rev: "$2,436",
    pct: 57
  }, {
    name: "Notion Freelance OS",
    rev: "$779",
    pct: 18
  }, {
    name: "Ambient Loops Vol. 2",
    rev: "$204",
    pct: 5
  }],
  // storefront
  storeProducts: [{
    id: "p1",
    name: "Golden Hour Presets",
    type: "ZIP",
    price: "$29",
    blurb: "20 warm, filmic Lightroom presets for portraits & travel."
  }, {
    id: "p2",
    name: "Notion Freelance OS",
    type: "PDF",
    price: "$19",
    blurb: "The all-in-one Notion system to run your freelance business."
  }, {
    id: "p3",
    name: "Ambient Loops Vol. 2",
    type: "Audio",
    price: "$12",
    blurb: "24 royalty-free ambient loops for focus and film."
  }, {
    id: "p6",
    name: "Portrait LUT Bundle",
    type: "ZIP",
    price: "$34",
    blurb: "Cinematic color LUTs for video — DaVinci & Premiere."
  }, {
    id: "p7",
    name: "Client Contract Kit",
    type: "PDF",
    price: "$22",
    blurb: "Lawyer-reviewed contract templates for creatives."
  }, {
    id: "p8",
    name: "Procreate Brush Set",
    type: "ZIP",
    price: "$16",
    blurb: "48 textured brushes for illustration and lettering."
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardTitle = __ds_scope.CardTitle;

__ds_ns.CardDescription = __ds_scope.CardDescription;

__ds_ns.CardAction = __ds_scope.CardAction;

__ds_ns.CardContent = __ds_scope.CardContent;

__ds_ns.CardFooter = __ds_scope.CardFooter;

__ds_ns.Separator = __ds_scope.Separator;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Label = __ds_scope.Label;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();

// ProductsScreen — data table with search, filters, status badges, row actions.
function ProductsScreen({ NS, onEdit }) {
  const { Button, Badge, Input, Tooltip, Separator } = NS;
  const d = window.CC_DATA;
  const { useState } = React;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const rows = d.products.filter((p) =>
    (filter === "All" || p.status === filter) &&
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const th = { textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", padding: "0 12px", height: 36, whiteSpace: "nowrap" };
  const td = { padding: "0 12px", height: 52, fontSize: 14, borderTop: "1px solid var(--border)", verticalAlign: "middle" };

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 24, letterSpacing: "-0.02em", margin: 0 }}>Products</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, margin: "4px 0 0" }}>{d.products.length} products · 3 drafts</p>
        </div>
        <div style={{ flex: 1 }} />
        <Button onClick={() => onEdit("new")}><Icon name="plus" size={16} />New product</Button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", width: 280 }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }}><Icon name="search" size={15} /></span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--muted)", padding: 3, borderRadius: "var(--radius-lg)" }}>
          {["All", "Published", "Draft"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              border: 0, cursor: "pointer", height: 26, padding: "0 12px", borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
              background: filter === f ? "var(--background)" : "transparent",
              color: filter === f ? "var(--foreground)" : "var(--muted-foreground)",
              boxShadow: filter === f ? "var(--ring-card)" : "none",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: "var(--radius-xl)", boxShadow: "var(--ring-card)", overflow: "hidden", background: "var(--card)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Product</th>
              <th style={th}>Type</th>
              <th style={{ ...th, textAlign: "right" }}>Price</th>
              <th style={{ ...th, textAlign: "right" }}>Sold</th>
              <th style={th}>Status</th>
              <th style={th}>Updated</th>
              <th style={{ ...th, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="cc-tr">
                <td style={{ ...td, fontWeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}>
                      <Icon name={p.type === "PDF" ? "file-text" : p.type === "Audio" ? "audio-lines" : "package"} size={16} />
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{p.name}</span>
                  </div>
                </td>
                <td style={td}><Badge variant="outline">{p.type}</Badge></td>
                <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{p.price}</td>
                <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>{p.sold}</td>
                <td style={td}><Badge variant={p.status === "Published" ? "default" : "secondary"} dot={p.status === "Draft"}>{p.status}</Badge></td>
                <td style={{ ...td, color: "var(--muted-foreground)", fontSize: 13 }}>{p.updated}</td>
                <td style={{ ...td }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <Tooltip content="Edit"><Button variant="ghost" size="icon-sm" onClick={() => onEdit(p.id)}><Icon name="pencil" size={14} /></Button></Tooltip>
                    <Tooltip content="Duplicate"><Button variant="ghost" size="icon-sm"><Icon name="copy" size={14} /></Button></Tooltip>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "var(--muted-foreground)", height: 80 }}>No products match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--muted-foreground)" }}>
        <span>Showing {rows.length} of {d.products.length}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
window.ProductsScreen = ProductsScreen;

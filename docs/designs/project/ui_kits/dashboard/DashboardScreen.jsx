// DashboardScreen — Overview: KPI tiles, top products, onboarding checklist.
function DashboardScreen({ NS }) {
  const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction, Badge, Button, Separator } = NS;
  const d = window.CC_DATA;
  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 24, letterSpacing: "-0.02em", margin: 0 }}>Welcome back, Gabi</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, margin: "4px 0 0" }}>Here's how your storefront is doing.</p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {d.kpis.map((k) => (
          <Card key={k.label} size="sm">
            <CardHeader>
              <CardDescription>{k.label}</CardDescription>
              {k.delta && (
                <CardAction>
                  <Badge variant={k.up ? "default" : "destructive"}>{k.delta}</Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>By revenue, last 30 days</CardDescription>
          </CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {d.topProducts.map((p) => (
              <div key={p.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>{p.rev}</span>
                </div>
                <div style={{ height: 8, background: "var(--muted)", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ width: p.pct + "%", height: "100%", background: "var(--primary)", borderRadius: 9999 }} />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">View all sales</Button>
          </CardFooter>
        </Card>

        {/* Onboarding checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Get your first sale</CardTitle>
            <CardDescription>3 of 5 complete</CardDescription>
          </CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {d.checklist.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: i < d.checklist.length - 1 ? "1px solid var(--border)" : 0 }}>
                <span style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center",
                  background: c.done ? "var(--primary)" : "transparent", border: c.done ? "0" : "1.5px solid var(--border)", color: "var(--primary-foreground)" }}>
                  {c.done && <Icon name="check" size={12} />}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: c.done ? 400 : 500, color: c.done ? "var(--muted-foreground)" : "var(--foreground)", textDecoration: c.done ? "line-through" : "none" }}>{c.label}</div>
                  {c.sub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>{c.sub}</div>}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button size="sm">Connect Stripe</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
window.DashboardScreen = DashboardScreen;

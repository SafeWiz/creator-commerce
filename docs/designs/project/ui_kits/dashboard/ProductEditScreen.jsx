// ProductEditScreen — the product form archetype (RHF + zod + UploadThing + AI).
function ProductEditScreen({ NS, productId, onBack }) {
  const { Button, Badge, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, Separator, Tooltip } = NS;
  const d = window.CC_DATA;
  const existing = d.products.find((p) => p.id === productId);
  const isNew = productId === "new";

  const fieldRow = { display: "flex", flexDirection: "column", gap: 6 };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Breadcrumb + header */}
      <div>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "transparent", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 13, fontFamily: "var(--font-sans)", padding: 0, marginBottom: 10 }}>
          <Icon name="chevron-left" size={15} />Products
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 24, letterSpacing: "-0.02em", margin: 0 }}>
            {isNew ? "New product" : existing?.name}
          </h1>
          {!isNew && <Badge variant={existing?.status === "Published" ? "default" : "secondary"} dot={existing?.status === "Draft"}>{existing?.status}</Badge>}
          <div style={{ flex: 1 }} />
          <Button variant="ghost">Discard</Button>
          <Button variant="outline">Save draft</Button>
          <Button>Publish</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left: main fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={fieldRow}>
                <Label htmlFor="name">Product name</Label>
                <Input id="name" defaultValue={isNew ? "" : existing?.name} placeholder="e.g. Lightroom Preset Pack" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldRow}>
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input id="price" defaultValue={isNew ? "" : existing?.price.replace("$", "")} placeholder="29.00" />
                </div>
                <div style={fieldRow}>
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" placeholder="golden-hour-presets" />
                </div>
              </div>
              <div style={fieldRow}>
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" asTextarea placeholder="Describe what buyers get…" />
              </div>
            </CardContent>
          </Card>

          {/* AI generation */}
          <Card>
            <CardHeader>
              <CardTitle>AI product page</CardTitle>
              <CardDescription>Generate a description &amp; teaser from the uploaded file.</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: "var(--radius-lg)", background: "color-mix(in oklch,var(--primary),transparent 94%)", border: "1px solid color-mix(in oklch,var(--primary),transparent 80%)" }}>
                <span style={{ color: "var(--primary)" }}><Icon name="sparkles" size={18} /></span>
                <div style={{ flex: 1, fontSize: 13 }}>Detected a <b>ZIP</b> asset. Generate a page draft with an image teaser?</div>
                <Button size="sm"><Icon name="sparkles" size={14} />Generate</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: uploads + status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <CardHeader><CardTitle>Digital asset</CardTitle></CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ border: "1.5px dashed var(--border)", borderRadius: "var(--radius-lg)", padding: 20, textAlign: "center", color: "var(--muted-foreground)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Icon name="upload-cloud" size={22} /></div>
                <div style={{ fontSize: 13 }}>Drop a file or <span style={{ color: "var(--primary)", fontWeight: 500 }}>browse</span></div>
                <div style={{ fontSize: 11, marginTop: 4 }}>ZIP, PDF, audio · up to 2 GB</div>
              </div>
              {!isNew && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                  <Icon name="file-check" size={16} />
                  <span style={{ fontSize: 13, flex: 1 }}>golden-hour-v2.zip</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>48 MB</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Cover image</CardTitle></CardHeader>
            <CardContent>
              <div style={{ aspectRatio: "16/10", borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg, var(--olive-100), var(--olive-200))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                <Icon name="image" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
window.ProductEditScreen = ProductEditScreen;

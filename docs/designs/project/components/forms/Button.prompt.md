**Button** — primary action control; use for any clickable action. Compact 32px default height, Nunito Sans medium, 7px radius, presses down 1px on `:active`.

```jsx
<Button>Publish</Button>
<Button variant="outline" size="sm">Save draft</Button>
<Button variant="ghost" size="icon-sm"><PlusIcon /></Button>
<Button variant="destructive">Delete</Button>
```

Variants: `default` (green primary), `outline`, `secondary`, `ghost`, `destructive` (tinted red, not solid), `link`. Sizes: `xs`/`sm`/`default`/`lg` plus square `icon`/`icon-sm`/`icon-lg`. Icons are auto-sized to 16px (14px at sm). Use `default` for the single primary action per view; `outline`/`ghost` for secondary actions.

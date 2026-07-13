**Badge** — status / metadata pill. Fully rounded, 20px tall, 12px text.

```jsx
<Badge>Published</Badge>
<Badge variant="secondary" dot>Draft</Badge>
<Badge variant="outline">PDF</Badge>
<Badge variant="destructive">Refunded</Badge>
```

Variants: `default` (green), `secondary` (used for Draft), `destructive` (tinted red), `outline`, `ghost`. Pass `dot` for a leading status dot. Convention in this product: **Published** → default green, **Draft** → secondary.

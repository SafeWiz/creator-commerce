**Input** — text entry field for forms (product name, price, search, handle). 32px tall, transparent bg with hairline border, 3px translucent focus ring. Pair with `Label`.

```jsx
<Label htmlFor="name">Product name</Label>
<Input id="name" placeholder="e.g. Lightroom Preset Pack" />
<Input asTextarea placeholder="Description…" />
<Input aria-invalid="true" defaultValue="—" />
```

Pass `asTextarea` for a multi-line resizable field. Set `aria-invalid="true"` to show the red error state. `disabled` dims and greys the field.

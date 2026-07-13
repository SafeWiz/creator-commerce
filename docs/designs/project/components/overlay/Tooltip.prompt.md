**Tooltip** — dark popup label shown on hover/focus of its child. Foreground-colored background, 12px text, arrow.

```jsx
<Tooltip content="Duplicate product">
  <Button variant="ghost" size="icon-sm"><CopyIcon/></Button>
</Tooltip>
<Tooltip content="Only you can see drafts" side="bottom"><InfoIcon/></Tooltip>
```

Wrap a single interactive trigger. Keep labels short. Used heavily on icon-only buttons (e.g. collapsed sidebar, table row actions).

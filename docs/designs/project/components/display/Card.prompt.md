**Card** — grouped-content surface. Elevation is a 1px hairline ring, not a drop shadow. Compose from the subparts:

```jsx
<Card>
  <CardHeader>
    <CardTitle>Monthly revenue</CardTitle>
    <CardDescription>Last 30 days</CardDescription>
    <CardAction><Button variant="ghost" size="icon-sm"><MoreIcon/></Button></CardAction>
  </CardHeader>
  <CardContent><span className="kpi">$4,280</span></CardContent>
  <CardFooter><Button variant="outline" size="sm">View sales</Button></CardFooter>
</Card>
```

Parts: `CardHeader`, `CardTitle` (Roboto medium), `CardDescription` (muted), `CardAction` (top-right slot), `CardContent`, `CardFooter` (muted bar with top border). Use `size="sm"` for dense dashboard tiles. A leading `<img>` bleeds to the rounded top edge — good for product cards.

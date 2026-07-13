**Skeleton** — loading placeholder with a slow pulse. Give it explicit dimensions.

```jsx
<Skeleton style={{height:16,width:"60%"}} />
<Skeleton style={{height:40,width:40,borderRadius:9999}} />
```

Used for the product table (`loading.tsx`) and storefront grid while server components stream.

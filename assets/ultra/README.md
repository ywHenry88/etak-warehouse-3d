# Ultra surface assets

The three photographic PBR sets are from **Poly Haven**, under
[CC0](https://polyhaven.com/license):

- [Concrete Floor](https://polyhaven.com/a/concrete_floor)
- [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall)
- [Plywood](https://polyhaven.com/a/plywood)

`sources.json` records the original download URLs. `textures.json` embeds
compressed WebP colour, OpenGL normal and roughness maps. Colour was adjusted
to suit the warehouse; geometry, normal and roughness source detail is retained.
The 1024/512px maps are shared, decoded on first Ultra entry and need no network
at runtime, including when the HTML is opened directly from disk.

Rebuild with Node.js and Python/Pillow:

```
node scripts/fetch-ultra-textures.mjs
python scripts/pack-ultra-textures.py
npm run build
```

Other finishes (paint, bare metal, insulated panels, PVC curtains, rubber,
fabric, skin, packing tape and printed cartons) are generated in
`src/ultra-detail.js`. The clean warehouse keeps only subtle wear. These maps
are surface detail, not a replacement for higher resolution actor geometry.

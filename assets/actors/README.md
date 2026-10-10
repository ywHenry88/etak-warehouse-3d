# Warehouse Ultra actors

The production GLB is exported from the Blender MCP asset pilot using
`scripts/prototype/export-runtime.py`. `embedded.json` contains the identical
GLB as base64 for offline single-file HTML. Source references, texture provenance
and human mesh attribution are in [the asset sources](ASSET_SOURCES.md).

Ultra now uses NICHIYU FBT-style electric counterbalance forklifts, articulated
drivers, eight walking/pushing staff and twelve pallet trucks (eight moving,
four parked). Cold-route staff retain insulated long coats; other staff use a
short jacket. These are visual approximations from the supplied photographs,
not manufacturer CAD.

The package is 2,594,576 bytes before base64. Forklifts use 23,232 triangles
within 11 metres and 11,990 beyond 14 metres, with hysteresis between thresholds.
Workers use the 5,874-triangle rig and independent skeletons. Geometry, materials
and twenty texture objects are shared across clones. Vehicles are scaled to
99% width and 97% length to fit the existing traffic envelope. Forks, wheels,
cargo visibility and staff poses follow the existing simulation.

The current materials use explicitly sRGB-authored albedo, fixing an earlier
linear-tint bake that crushed navy clothing and red enamel to nearly black.
512px fabric, paint, rubber and upholstery maps separate colour, normal and
roughness detail. Continuous sleeves and trousers use blended elbow/knee weights, with subtle folds; subtle facial
colour and short-range contact shading are baked into vertex colours. Staff
share three skin/workwear colour variants, with slight gait/body counter-motion.
Each worker adds only 74 triangles (about 1.3%); forklift triangle counts and material primitive counts are unchanged. No runtime light
or postprocessing pass was added; the extra six texture objects and vertex
colours still carry a small memory cost.

Regenerate: run `python scripts/prototype/prepare-realism.py` (Pillow/NumPy),
then execute `scripts/prototype/export-runtime.py` through Blender MCP with the
pilot scene open. The exporter refines temporary copies using
`runtime-realism.py`; it preserves the source scene and removes temporary data.

Decoding starts only on the first Ultra promotion. Exiting Ultra restores the
original geometry and releases the added GPU buffers, materials, textures and
bone textures; decoded CPU data is retained for subsequent promotion. The
existing automatic FPS policy remains: two samples above 80 FPS enable Ultra,
two below 60 FPS return it to High. Higher detail costs more; no physical-device
FPS guarantee is implied.

Validation: `node test_ultra_actors.cjs` exercises asynchronous cancellation,
all actor counts, matching simulation trajectories, independent skeletal motion,
driver pose, dimensions, animated lift, camera LOD, actual performance callbacks,
repeatable fallback resource counts, sRGB albedo levels, vertex colours, offline
loading and desktop/mobile renders. Reported frame costs are headless Edge
measurements and are not a guarantee of sustained Ultra FPS on physical devices.
`npm test`, `node test_performance.cjs` and `node test_ultra_detail.cjs` cover
routes/doors/tours, FPS policy and surface texture restoration respectively.

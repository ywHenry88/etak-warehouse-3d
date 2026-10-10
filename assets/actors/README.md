# Warehouse Ultra actors

The production GLB is exported from the Blender MCP asset pilot using
`scripts/prototype/export-runtime.py`. `embedded.json` contains the identical
GLB as base64 for offline single-file HTML. Source references, texture provenance
and human mesh attribution are in [the pilot sources](../prototype/ASSET_SOURCES.md).

Ultra now uses NICHIYU FBT-style electric counterbalance forklifts, articulated
drivers, eight walking/pushing staff and twelve pallet trucks (eight moving,
four parked). Cold-route staff retain insulated long coats; other staff use a
short jacket. These are visual approximations from the supplied photographs,
not manufacturer CAD.

The package is 2,288,888 bytes before base64. Forklifts use 23,232 triangles
within 11 metres and 11,990 beyond 14 metres, with hysteresis between thresholds.
Workers use the 5,800-triangle rig and independent skeletons. Geometry, materials
and fourteen texture objects are shared across clones. Vehicles are scaled to
99% width and 97% length to fit the existing traffic envelope. Forks, wheels,
cargo visibility and staff poses follow the existing simulation.

Decoding starts only on the first Ultra promotion. Exiting Ultra restores the
original geometry and releases the added GPU buffers, materials, textures and
bone textures; decoded CPU data is retained for subsequent promotion. The
existing automatic FPS policy remains: two samples above 80 FPS enable Ultra,
two below 60 FPS return it to High. Higher detail costs more; no physical-device
FPS guarantee is implied.

Validation: `node test_ultra_actors.cjs` exercises asynchronous cancellation,
all actor counts, matching simulation trajectories, independent skeletal motion,
driver pose, dimensions, animated lift, camera LOD, actual performance callbacks,
repeatable fallback resource counts, offline loading and desktop/mobile renders.
`npm test`, `node test_performance.cjs` and `node test_ultra_detail.cjs` cover
routes/doors/tours, FPS policy and surface texture restoration respectively.

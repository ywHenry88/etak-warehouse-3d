# Blender asset pilot / NICHIYU

Open [the interactive comparison](../../prototype.html) or the standalone
`Preview.html` in `C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010`.
The pilot is a separate review page. The warehouse's production actors and
navigation have not yet been replaced.

## Delivered assets

- NICHIYU three-wheel electric counterbalance forklift, visually reconstructed
  from the four supplied photos. Two front wheels and one centre rear steering
  assembly with twin tyres. Graphite guard and mast, red battery/counterweight
  panels, red fork heels, chain/ram details, NICHIYU and SICOS AC 15 markings.
- Worker with anatomical face, insulated coat, safety helmet, skinning and a
  looped walk animation. Anatomy source is CC0 MakeHuman; see ASSET_SOURCES.md.
- Carton/pallet load and pallet truck, with shared PBR maps and labels.
- Concrete floor, insulated wall, structural plaster and blue rapid-door sample.
- Three 1440x960 Cycles stills, embedded in the offline comparison page.
- Blender source with packed images and standalone GLBs in the desktop folder.

`ETAK_Pilot_Web.glb` combines shared materials/images and contains both LODs.
Dimensions are in metres. GLB uses Y-up; the Blender scene uses Z-up.
Forklift vehicle forward is -Z in GLB; worker forward is +Z. This must be
adapted before replacing the production vehicle paths. `Lift_carriage`, wheel
pivots and `Rear_steering_axle` remain separate for operational animation.
The pilot only plays the worker's walk; vehicle driving is not integrated yet.

| Asset | Full triangles | Light triangles |
| --- | ---: | ---: |
| NICHIYU forklift, without driver/load | 23,232 | 11,990 |
| Worker | 13,184 | 5,800 |
| Loaded pallet | 7,716 | 3,724 |
| Pallet truck | 796 | 796 |

## Evidence and limits

Browser tests validate local/offline loading, a moving skeleton, lower LOD
triangle counts, language switching, render gallery, no horizontal mobile
overflow and no page/console errors. `browser_report.json` stores headless Edge
measurements. This environment produced approximately 30 FPS in both versions;
it does not demonstrate a speed improvement or certify physical phone FPS.
The full pilot group uses 49,148 triangles and 63 main scene draw primitives
versus 15,664 / 60 for the legacy group with the same environment. Shadow passes
are additional. Increased visual detail has a real cost.

The main warehouse now integrates these assets in Ultra mode with distance LOD
and driver/pushing poses; see [runtime integration](../actors/README.md).
Further material consolidation and measurement on target hardware remain useful.
This is a reviewable visual pilot, not manufacturer CAD or a completed
photorealistic warehouse rebuild. Capacity and dimensions are not verified.

## Reproduce

1. `python scripts/prototype/prepare.py`
2. Execute `scripts/prototype/build.py` via the live Blender MCP connection.
3. Execute `scripts/prototype/refine.py` once in that pilot scene.
4. `python scripts/prototype/nichiyu-labels.py`
5. Execute `scripts/prototype/nichiyu.py`, then `finalize.py` via MCP.
6. Render the three named cameras via MCP and copy PNG/JPEGs to the desktop
   delivery folder as `01_Asset_pilot`, `02_Forklift_detail`, `03_Worker_goods`.
7. `node scripts/prototype/build-preview.mjs`
8. `node scripts/prototype/check-preview.cjs`

The scripts preserve other Blender scenes. Regeneration of the NICHIYU and LOD
objects replaces only the explicitly named pilot objects. Run in the pilot
scene, not a scene containing unrelated objects with those names.

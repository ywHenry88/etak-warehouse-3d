# ETAK Warehouse 3D

Traditional Chinese / English interactive Three.js warehouse, based on the supplied ATL A1 East plans and CCTV reference photographs.

**Latest version (single public entry):** https://ywHenry88.github.io/etak-warehouse-3d/

Ultra includes the integrated Blender NICHIYU forklifts, staff and pallet trucks. See [actor details](assets/actors/README.md) for model budgets and validation. The separate pilot viewer has been retired.


## Explore

- The gold play arrow immediately before **Controls** starts or pauses the auto tour. The globe at the upper right switches between Traditional Chinese (default) and English.
- Auto tours play an original, energetic **124 BPM electronic instrumental** with drums, bass, chord stabs and a melodic synth. Nearby rapid doors make a short motor/air opening sound; music briefly ducks for clarity. The speaker button mutes both. Audio starts after a user click and pauses with the tour, when the tab is hidden, or when the tour ends. Web Audio synthesis needs no downloads and works in the offline HTML.
- Auto tour opens at **03 · Loading docks**, holds briefly, then flies above the warehouse and descends at the existing red-route Start. After all 29 checkpoints it flies back to the same Loading docks view. Pause/resume, stop and viewpoint changes also work during both flights; mobile controls remain compact.
- The highlighted **自動導覽 · 全倉巡覽 / Auto tour** button follows the supplied red walking route from the southwest Start to the south dispatch End: south aisle → C17 ramp → truck apron → C16 ramp → W3 → W2/W1 doors → north freezer out-and-back → W2/W6 → central freezer out-and-back → south dispatch. Ordered checkpoints preserve both return legs, with smooth camera turns and local detours for traffic.
- Walking defaults to **4× the earlier version**: manual movement 8 m/s; guided movement 6.6 m/s. Doors and traffic can add waiting time. Pause/resume/stop remain available.
- **Eight staff and four forklifts** work on independent continuous circuits. Staff walk at 1.65 m/s from randomized starting positions and alternate loaded pallet trucks, empty trucks and walking without equipment. Two forklifts dispatch to trailers and two transfer pallets within W2/W6. Only door and pedestrian clearance can briefly interrupt movement; there are no group-based idle periods.
- Rapid doors default closed, opening for approaching/passing people or equipment and closing after clearance. Explicit manual Open/Close overrides are available.
- The two −18°C rooms use pale blue frost finishes, cool overhead lighting, illuminated snowflake/temperature signs and gentle white condensation. The mist uses one GPU draw call, with 48 particles (24 on the Eco profile), transparent soft edges and no ambient-occlusion rectangles.
- Workers assigned to frozen-room routes, including the north freezer forklift driver, wear long insulated coats and gloves throughout their duties. The coat hem sways when walking and drapes over the lap when seated.
- The north frozen zone is marked **−18°C**, with insulated panels, cold-room equipment and organized storage. Truck pavement is 1.5 m below the warehouse; trailer beds align with the loading floor.
- **W3** is a rack-free loading room with protected walls and a stainless bench, informed by C13/C14. **W2 and W6 are chilled (4–10°C)** with the same +0.25 m floor and an open connection. Automatic rapid doors separate W2/W3 and W2/W1; short transitions are at those boundaries, not between W2/W6.
- Staff have articulated knees and elbows, shaped workwear, faces and hard hats. Forklifts have rounded bodywork, seated operators, wheel hubs, hydraulics and controls; pallet trucks and truck cabs also use shaped parts. Shared geometry/materials and merged rigid parts limit rendering cost. Approximate triangle budgets: 3,624 per standard worker / 4,440 with a long coat, 9,544 per forklift including its driver / 10,360 with a coated driver (excluding cargo), and 604 per pallet truck.
- The small top-right counter shows measured **FPS and milliseconds per frame**, independently of simulation speed. Rendering automatically adjusts resolution, shadows and ambient occlusion when frame rate stays low; phone/touch layouts start with lighter settings. Actual FPS depends on hardware, browser, temperature and scene view.
- **Ultra** activates on any device after two consecutive 1.5-second samples above 80 FPS. It uses a 1.5–2× render scale, 4096-pixel shadows, ambient occlusion and antialiasing. The counter also shows the active quality. If Ultra stays below 60 FPS for two samples, it drops to High; a 15-second promotion cooldown prevents rapid switching.
- Ultra uses CC0 photographic PBR maps for concrete, painted walls and pallet wood. Ground and wall textures use metre-scaled projection, including extruded slabs and instanced geometry. Separate paint, brushed steel, insulated panel, PVC, rubber, fabric, skin, tape and printed carton finishes cover vehicles, staff and storage. Paint is dielectric with satin roughness; bare steel retains metallic reflections. 36 shared 1024/512px maps and up to 16x anisotropic filtering add no scene geometry or draw calls. Photographic maps add approximately 1.43 MiB to the standalone HTML and decode only on first Ultra entry. Downgrading restores materials, shader hooks, colours and lighting, releasing additional GPU textures. Signs remain 1024x256 in Ultra. See assets/ultra/README.md for sources, CC0 licensing and regeneration instructions. Automatic FPS fallback remains active.
- The supplied ETAK banner is mounted on the central wall facing the truck apron. The five foreground parking columns have been removed for visibility.
- 27 camera views include 25 reference images for 24 cameras. C04/C07/C08 have plan locations only; C14 has two reference images.

Click and drag to orbit, scroll to zoom, right-drag to pan. Manual walking uses WASD/arrows, drag to look, E for a nearby door and Escape to exit. Mobile provides touch controls.

On mobile, walking controls start collapsed into a small bottom bar. Tap **+** to expand; controls hide again after five seconds without input or when you touch the scene. Pause/resume and exit stay accessible during the tour. The exploration menu also hides after choosing a view or five seconds without input.

Tours route around equipment using the same clearance as vehicle yielding. When a passage is blocked, the visitor can step aside and replan. Equipment stays on continuous circuits rather than parking across aisles.

Walking uses a 90° vertical field of view. Guided routes merge clear straight sections of the navigation grid, with a forward-looking camera and gradual turns to remove left/right oscillation on the truck apron. Every shortcut is checked against walls, storage, equipment and floor-level changes.

## Build

Requires Node.js 22 or newer.

```sh
npm ci
npm run build
```

The build creates `index.html` for GitHub Pages and `ETAK_Warehouse_3D.html` for offline use. Runtime code, plan, banner and photos are embedded, so the standalone file requires no asset server. Use Edge or Chrome with WebGL2.

## Validation

```sh
npm test
node test_v8_random.cjs
node test_actors.cjs
node test_cold_mist.cjs
node test_performance.cjs
node test_ultra_detail.cjs
node test_ultra_actors.cjs
node test_tour_flight.cjs
node test_tour_audio.cjs
```

The current browser test uses an installed Microsoft Edge. It checks four forklifts and eight staff, randomized starts, mixed pallet-truck use, continuous work, route/wall and closed-door clearance, tours at multiple traffic phases, W2/W6 levels, both new doors, rack-free W3 and the compact mobile controls. Set `WAREHOUSE_URL` to test a deployed site. Detailed output is saved locally in `final-validation.json`.

`test_actors.cjs` checks model triangle budgets and human scale, renders a close-up model sheet, and samples FPS on desktop and an emulated mobile viewport. Headless/emulated measurements do not certify performance on physical phones.

## Model interpretation

Rack organization follows `Warehouse2025 1030.pdf`, with scale anchored by `ETAK_Logistics-ATL_A1E_07_Layout_AI.pdf`. CCTV photographs dated 28 September 2026 guide materials and equipment. The model tidies clutter. Camera lenses, heights, rack details and ramp dimensions are estimates; this visualization is not surveyed construction documentation. Approximately 80% of storage positions are stocked, with circulation and loading zones kept clear.

Source modules: `src/main.js` (geometry), `src/operations.js` (people, vehicles, doors and walking), `src/tour.js` (pathfinding), and `src/i18n.js` (translations). `index.template.html` defines the interface. Three.js licensing is retained in `THREE-LICENSE.txt`. Source imagery and branding remain the property of their respective owners.

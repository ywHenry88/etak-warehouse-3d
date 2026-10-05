# ETAK Warehouse 3D

Traditional Chinese / English interactive Three.js warehouse, based on the supplied ATL A1 East plans and CCTV reference photographs.

**Live site:** https://ywHenry88.github.io/etak-warehouse-3d/

## Explore

- The highlighted **自動導覽 · 全倉巡覽 / Auto tour** button starts a hands-free, 14-stop tour through storage, dispatch, cold rooms, ramps and the truck apron.
- Walking defaults to **5× the earlier version**: manual movement 10 m/s; guided movement 8.25 m/s. Doors and traffic can add waiting time. Pause/resume/stop remain available.
- **Six staff** walk and work with pallet trucks; **three forklifts** pick, carry and load goods. Four staff circulate in separate work zones while two handle trailer dispatch.
- Rapid doors default closed, opening for approaching/passing people or equipment and closing after clearance. Explicit manual Open/Close overrides are available.
- The north frozen zone is marked **−18°C**, with insulated panels, cold-room equipment and organized storage. Truck pavement is 1.5 m below the warehouse; trailer beds align with the loading floor.
- The supplied ETAK banner is mounted on the central wall facing the truck apron. The five foreground parking columns have been removed for visibility.
- 27 camera views include 25 reference images for 24 cameras. C04/C07/C08 have plan locations only; C14 has two reference images.

Click and drag to orbit, scroll to zoom, right-drag to pan. Manual walking uses WASD/arrows, drag to look, E for a nearby door and Escape to exit. Mobile provides touch controls.

On mobile, walking controls start collapsed into a small bottom bar. Tap **+** to expand; controls hide again after five seconds without input or when you touch the scene. Pause/resume and exit stay accessible during the tour. The exploration menu also hides after choosing a view or five seconds without input.

Tours route around equipment using the same clearance as vehicle yielding. When a passage is blocked, the visitor can step aside and replan. Tour entry selects a clear starting position, and returning forklifts park with their forks clear of the walking aisle.

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
node test_traffic.cjs
```

The browser test uses an installed Microsoft Edge. It checks three forklifts and six working staff, route/wall and closed-door clearance, complete tours at multiple traffic phases, bilingual controls, the promoted tour interface and mobile layout. Set `WAREHOUSE_URL` to test a deployed site. Detailed test output is saved locally in `final-validation.json`.

## Model interpretation

Rack organization follows `Warehouse2025 1030.pdf`, with scale anchored by `ETAK_Logistics-ATL_A1E_07_Layout_AI.pdf`. CCTV photographs dated 28 September 2026 guide materials and equipment. The model tidies clutter. Camera lenses, heights, rack details and ramp dimensions are estimates; this visualization is not surveyed construction documentation. Approximately 80% of storage positions are stocked, with circulation and loading zones kept clear.

Source modules: `src/main.js` (geometry), `src/operations.js` (people, vehicles, doors and walking), `src/tour.js` (pathfinding), and `src/i18n.js` (translations). `index.template.html` defines the interface. Three.js licensing is retained in `THREE-LICENSE.txt`. Source imagery and branding remain the property of their respective owners.

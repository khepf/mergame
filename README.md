# Mergame

A 2D open-world browser game. Plain JavaScript + Canvas, no build step, no dependencies.

## Run

```
npm start
```

Then open http://localhost:8080. (A local server is needed because ES modules don't load from `file://`.)

**Controls:** WASD / Arrow keys to move, Shift to run, E to hop on/off the bike, 1-5 to select a bag slot, Space to use the selected item (chop with the axe, swing the sword), click to interact.

## Layout

```
index.html, style.css     page shell + UI styles
serve.js                  tiny local dev server (npm start)
src/
  main.js                 entry point: creates the game, wires things together, game loop
  core/                   engine-level building blocks
  world/                  the map and things that live in it
  places/                 buildings and locations
  player/                 the player character and what they can do
  items/                  items, inventories, money
  audio/                  music and sound
  ui/                     everything drawn over the game
```

| File | Purpose |
|---|---|
| `src/main.js` | Creates world / player / UI, connects interactions (chest, shop, bank, bike), saving, fainting, game loop, mouse clicks |
| **core/** | |
| `core/constants.js` | Tile size, tile types, solid / swimmable / no-ride tiles |
| `core/utils.js` | Seeded RNG, clamp, shape helpers (circle, ellipse, rounded rect) |
| `core/input.js` | Keyboard state (ignores keys while typing in a text box) |
| `core/camera.js` | Smooth follow camera clamped to world bounds |
| `core/save.js` | Save / load progress in localStorage (autosaves; "New game" button clears it) |
| **world/** | |
| `world/world.js` | Tile map, world generation (pond, path, trees), collision, particles, regions |
| `world/trees.js` | Choppable trees: hits, felling animation, stumps, wood drops |
| `world/bats.js` | Cave bats: flight / swarming, sword hits, wing drops. **`BAT_SETTINGS`** at the top controls max bats, respawn time, hits to kill, bite damage / rate |
| `world/pickups.js` | Items on the ground: bounce, bob, auto-pickup |
| `world/props.js` | Drawings for trees, stumps, rocks |
| **places/** | |
| `places/house.js` | The player's home: walls, door, chest, radio, fading roof |
| `places/furniture.js` | Drawings for the house furniture (bed, bookshelf, chest, radio, ...) |
| `places/town.js` | Market Square: plaza, lots, fountain, lamps, signs |
| `places/cave.js` | The Bat Cave: hillside north of town, cave carving, hill overlay, darkness, bat respawning |
| `places/store.js` | General Store: what it buys / sells, building, counter, merchant |
| `places/bank.js` | The Bank: building, teller cage, teller |
| **player/** | |
| `player/player.js` | Movement, collision, swimming, riding, tool swings, health, drawing. **`HEALTH_SETTINGS`** at the top: max health, regen, faint penalty |
| `player/bicycle.js` | Rideable bike: parked object + drawing (side / front / back views) |
| `player/actions.js` | What using (Space) each held item does |
| **items/** | |
| `items/items.js` | Item definitions + procedurally drawn icons |
| `items/inventory.js` | Fixed-size item container with stacking (bag, chest) |
| `items/money.js` | Coins (gold / silver / bronze) and wallets (purse, bank account) |
| **audio/** | |
| `audio/radio.js` | Radio: streams a random Grateful Dead show from archive.org |
| `audio/fountainSound.js` | Synthesized fountain ambience (Web Audio), only heard right next to it |
| `audio/caveSound.js` | Synthesized cave ambience: rumble, hollow wind, echoing drips, distant bats (fades in inside the cave) |
| `audio/audioContext.js` | The one shared Web Audio context, unlocked on the first key press / click |
| **ui/** | |
| `ui/panels.js` | DOM UI: health bar, bag bar, coin purse, chest / shop / bank panels, toasts, save status |
| `ui/hud.js` | Canvas HUD: location label, controls hint, radio now-playing |

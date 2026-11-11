# Mergame

A 2D open-world browser game. Plain JavaScript + Canvas, no build step, no dependencies.

## Run

```
npm start
```

Then open http://localhost:8080. (A local server is needed because ES modules don't load from `file://`.)

**Controls:** WASD / Arrow keys to move, Shift to run, E to hop on/off the bike, 1-5 to select a bag slot, Space to use the selected item (e.g. chop with the axe), click to interact.

## Layout

| File | Purpose |
|---|---|
| `src/main.js` | Game loop, rendering order, HUD |
| `src/world.js` | Tile map, world generation (pond, path, trees), collision |
| `src/house.js` | The player's home: walls, door, furniture, fading roof |
| `src/town.js` | Market Square: cobblestone plaza, empty shop lots, fountain, lamps, signs |
| `src/store.js` | Shops: trade definitions (General Store), building, counter, merchant NPC |
| `src/money.js` | Coins (gold / silver / bronze) and the player's wallet |
| `src/radio.js` | Radio: streams a random Grateful Dead show from archive.org |
| `src/inventory.js` | Fixed-size item container with stacking (player bag, chests) |
| `src/actions.js` | What using (Space) each held item does |
| `src/trees.js` | Choppable trees: hits, felling animation, stumps, wood drops |
| `src/pickups.js` | Items on the ground: bounce, bob, auto-pickup |
| `src/items.js` | Item definitions + procedurally drawn icons |
| `src/ui.js` | DOM UI: bag bar, coin purse, chest panel, shop panel, toasts |
| `src/bicycle.js` | Rideable bike: parked object + drawing (side / front / back views) |
| `src/player.js` | Movement, collision, facing, walk animation, drawing |
| `src/sprites.js` | Procedural drawings for trees, rocks, furniture |
| `src/save.js` | Save / load progress in localStorage (autosaves; "New game" button clears it) |
| `src/camera.js` | Smooth follow camera clamped to world bounds |
| `src/input.js` | Keyboard state |
| `src/constants.js` | Tile size and tile types |

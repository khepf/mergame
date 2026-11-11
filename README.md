# Mergame

A 2D open-world browser game. Plain JavaScript + Canvas, no build step, no dependencies.

## Run

```
npm start
```

Then open http://localhost:8080. (A local server is needed because ES modules don't load from `file://`.)

**Controls:** WASD / Arrow keys to move, Shift to run, E to hop on/off the bike, click to interact.

## Layout

| File | Purpose |
|---|---|
| `src/main.js` | Game loop, rendering order, HUD |
| `src/world.js` | Tile map, world generation (pond, path, trees), collision |
| `src/house.js` | The player's home: walls, door, furniture, fading roof |
| `src/town.js` | Market Square: cobblestone plaza, empty shop lots, fountain, lamps, signs |
| `src/radio.js` | Radio: streams a random Grateful Dead show from archive.org |
| `src/inventory.js` | Fixed-size item container (player bag, chests) |
| `src/items.js` | Item definitions + procedurally drawn icons |
| `src/ui.js` | DOM inventory UI: bag bar, chest panel, toasts |
| `src/bicycle.js` | Rideable bike: parked object + drawing (side / front / back views) |
| `src/player.js` | Movement, collision, facing, walk animation, drawing |
| `src/sprites.js` | Procedural drawings for trees, rocks, furniture |
| `src/camera.js` | Smooth follow camera clamped to world bounds |
| `src/input.js` | Keyboard state |
| `src/constants.js` | Tile size and tile types |

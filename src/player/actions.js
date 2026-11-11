// What happens when the player uses (Space) the item in their hand.
import { findTreeInFront, chopTree } from '../world/trees.js';
import { findBatInFront, hitBat } from '../world/bats.js';

const APPLE_HEAL = 5; // health restored by eating an apple

export function useHeldItem(player, world) {
  switch (player.heldType) {
    case 'axe':
      if (player.bike) return world.notify?.('Hop off the bike to chop');
      if (player.swimming) return world.notify?.("You can't chop while swimming");
      player.startSwing(() => {
        // Look for the tree at the moment the axe connects
        const tree = findTreeInFront(world, player);
        if (tree) chopTree(world, tree, player);
      });
      break;

    case 'apple':
      if (player.health >= player.maxHealth) return world.notify?.("You're already at full health");
      player.inventory.remove('apple', 1);
      player.heal(APPLE_HEAL);
      world.addParticle({ x: player.x, y: player.y - 44, vx: 0, vy: -30, life: 0.9, text: `+${APPLE_HEAL}`, textColor: '#7ee081' });
      break;

    case 'sword':
      if (player.bike) return world.notify?.('Hop off the bike to swing your sword');
      if (player.swimming) return world.notify?.("You can't swing a sword while swimming");
      player.startSwing(() => {
        const bat = findBatInFront(world.cave.bats, player);
        if (bat) hitBat(world, world.cave, bat, player);
      });
      break;
  }
}

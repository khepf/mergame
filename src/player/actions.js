// What happens when the player uses (Space) the item in their hand.
import { findTreeInFront, chopTree } from '../world/trees.js';

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
  }
}

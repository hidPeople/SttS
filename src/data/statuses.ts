import type { StatusEffect } from '../models/types';

export const STATUS_DESCRIPTIONS: Record<StatusEffect, string> = {
  Charm: 'Charm: The next enemy attack targets EP instead of HP. One stack is consumed when it takes effect.',
  Lingering: 'Lingering: At the start of your turn, lose 1 energy per stack while energy remains.',
  Horny: 'Horny: EP damage received is multiplied by 1.5. Clears at EP Peak and grants 1 energy.',
  Heat: 'Heat: EP damage received is multiplied by 2. Clears at EP Peak and grants 1 energy.',
  Frustrated: 'Frustrated: EP damage received is multiplied by 3. Clears at EP Peak and grants 1 energy.',
};

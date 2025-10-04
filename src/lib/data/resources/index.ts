
import { rolesConfig } from "@/app/(main)/forms/roles/_data/config";
import { tcmTallyCardsConfig } from "@/app/(main)/forms/tally_cards/_data/config";

 export const resourceConfigs = {
   roles: rolesConfig,
  // add more later: "tally-cards": tallyCardsConfig,
  tcm_tally_cards: tcmTallyCardsConfig,
  // add more later…
 } as const;

 export type ResourceKey = keyof typeof resourceConfigs;

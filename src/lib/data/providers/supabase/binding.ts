import { createSupabaseReadOnlyProvider } from "@/lib/supabase/factory";
import { tcm_tally_cards as tallyCardsResource } from "../../resources";

export const tallyCardsAdapter = createSupabaseReadOnlyProvider(tallyCardsResource);

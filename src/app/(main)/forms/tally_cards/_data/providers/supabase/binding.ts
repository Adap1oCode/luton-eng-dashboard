import { createSupabaseReadOnlyProvider } from "@/lib/supabase/factory";
import { tcmTallyCardsConfig } from "../../_data/config"; // keep your canonical name

export const tallyCardsAdapter = createSupabaseReadOnlyProvider(tcmTallyCardsConfig);

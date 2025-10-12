import { createSupabaseReadOnlyProvider } from "@/lib/supabase/factory";
import { tcmTallyCardsConfig } from "../../config"; // keep your canonical name

export const tallyCardsAdapter = createSupabaseReadOnlyProvider(tcmTallyCardsConfig);

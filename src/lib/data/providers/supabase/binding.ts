import { createSupabaseReadOnlyProvider } from "@/lib/supabase/factory";
import { tallyCardsResource } from "../../config.resource";

export const tallyCardsAdapter = createSupabaseReadOnlyProvider(tallyCardsResource);

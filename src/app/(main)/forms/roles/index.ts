import type { RolesProvider } from "./_data/provider";
import { supabaseRolesProvider } from "./_data/providers/supabase";

export const dataProvider: RolesProvider = supabaseRolesProvider;

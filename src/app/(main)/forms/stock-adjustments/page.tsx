// app/(main)/forms/stock-adjustments/page.tsx
import ResourceSSRPage from "@/components/forms/resource-view/resource-ssr-page";
import { config } from "./view.config"; // make sure view.config exports this bundle

export const metadata = { title: config.title };

export default async function Page(props: { searchParams?: any }) {
  return (
    <ResourceSSRPage
      title={config.title}
      endpoint="/api/v_tcm_user_tally_card_entries"
      config={config.viewConfig}
      toolbar={config.toolbar}
      chips={config.chips}
      actions={config.actions}
      searchParams={props.searchParams}
      // Add toRow here IF your wrapper expects it and your API doesn't already project the final shape:
      // toRow={(d:any)=>({...})}
    />
  );
}

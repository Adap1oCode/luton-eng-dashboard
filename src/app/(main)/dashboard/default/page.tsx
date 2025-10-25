import dynamic from "next/dynamic";
const ChartAreaInteractive = dynamic(() => import("./_components/chart-area-interactive").then(m => m.ChartAreaInteractive), );
const DataTable = dynamic(() => import("./_components/data-table").then(m => m.DataTable), );
import data from "./_components/data.json";
import { SectionCards } from "./_components/section-cards";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable data={data} />
    </div>
  );
}

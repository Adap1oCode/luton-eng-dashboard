import dynamic from "next/dynamic";
const ChartAreaInteractive = dynamic(() => import("./_components/chart-area-interactive").then(m => m.ChartAreaInteractive), { ssr: false });
const DataTable = dynamic(() => import("./_components/data-table").then(m => m.DataTable), { ssr: false });
import data from "./_components/data.json";
import { SectionCards } from "./_components/section-cards";
const SummaryCards = dynamic(() => import("./_components/summary-cards"), { ssr: false });
const ChartBarVertical = dynamic(() => import("./_components/chart-bar-vertical"), { ssr: false });
const ChartDonut = dynamic(() => import("./_components/chart-donut"), { ssr: false });
const ChartBarHorizontal = dynamic(() => import("./_components/chart-bar-horizontal"), { ssr: false });
export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SummaryCards />
      <SectionCards />
      <ChartAreaInteractive />
      <ChartBarVertical />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartBarHorizontal />
      <ChartDonut />
      </div>

      <DataTable data={data} />
    </div>
  );
}

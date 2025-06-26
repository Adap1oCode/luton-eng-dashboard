import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import data from "./_components/data.json";
import { SectionCards } from "./_components/section-cards";
import SummaryCards from "./_components/summary-cards";
import ChartBarVertical from "./_components/chart-bar-vertical";
import ChartDonut from "./_components/chart-donut";
import ChartBarHorizontal from "./_components/chart-bar-horizontal";
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

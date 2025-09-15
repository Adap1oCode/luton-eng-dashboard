import { getRequisitions } from "@/app/(main)/dashboard/requisitions/_components/data";
import { requisitionsConfig } from "@/app/(main)/dashboard/requisitions/config";
import GenericDashboardPage from "@/components/dashboard/page";

export default async function AllRequisitionsPage() {
  // جلب جميع الطلبات
  const requisitions = await getRequisitions("all");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <h1 className="text-2xl font-bold">All Requisitions</h1>
      <div className="rounded-lg border">
        <div className="p-4">
          <p className="text-muted-foreground mb-4">عرض جميع الطلبات</p>
          {/* يمكن إضافة جدول لعرض جميع الطلبات هنا */}
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">رقم الطلب</th>
                  <th className="p-2 text-left">التاريخ</th>
                  <th className="p-2 text-left">الحالة</th>
                  <th className="p-2 text-left">المنشئ</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((req) => (
                  <tr key={req.requisition_order_number} className="border-b">
                    <td className="p-2">{req.requisition_order_number}</td>
                    <td className="p-2">{req.order_date}</td>
                    <td className="p-2">{req.status}</td>
                    <td className="p-2">{req.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server component wrapper (keeps page lightweight)
import RequisitionOrderForm from "./requisition-order-form";

export default function Page() {
  return (
    <div className="bg-background min-h-screen">
      <div className="w-full p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">New Requisition</h1>
        </div>
        <RequisitionOrderForm />
      </div>
    </div>
  );
}

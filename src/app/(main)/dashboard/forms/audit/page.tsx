"use client";

import { useState } from "react";
import DynamicForm from "./dynamic-form";
import SubmissionsTable, { AuditRow } from "./submissions-table";

export default function AuditFormPage() {
  const [current, setCurrent] = useState<AuditRow | null>(null);

return (
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     <div className="w-full flex flex-col">
       <SubmissionsTable onSelect={setCurrent} />
     </div>
     <div className="w-full flex flex-col">
       <DynamicForm initialData={current ?? undefined} />
     </div>
    </div>
  );
}

"use client";

import React from "react";

export default function WarehousesDebug({ warehouses }: { warehouses: any[] | undefined }) {
  React.useEffect(() => {
    console.log(`[WarehousesDebug] Received warehouses:`, {
      isUndefined: warehouses === undefined,
      isNull: warehouses === null,
      isArray: Array.isArray(warehouses),
      length: warehouses?.length,
      type: typeof warehouses,
      value: warehouses
    });
  }, [warehouses]);

  // ALWAYS render something - make it super visible
  if (!warehouses || warehouses.length === 0) {
    return (
      <div className="mb-4 rounded-lg border-4 border-red-500 bg-red-100 p-6 text-center">
        <h2 className="text-2xl font-bold text-red-700">❌ FAILURE: No warehouses loaded</h2>
        <p className="mt-2 text-lg text-red-600">
          warehouses: {warehouses === undefined ? "undefined" : warehouses === null ? "null" : "empty array (length: 0)"}
        </p>
        <p className="mt-2 text-sm text-red-500">
          Type: {typeof warehouses}, IsArray: {Array.isArray(warehouses) ? "yes" : "no"}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border-4 border-green-500 bg-green-100 p-6">
      <h2 className="text-2xl font-bold text-green-700">✅ SUCCESS: {warehouses.length} warehouses loaded</h2>
      <div className="mt-4 max-h-60 overflow-auto rounded bg-white p-4">
        <pre className="text-xs">{JSON.stringify(warehouses, null, 2)}</pre>
      </div>
    </div>
  );
}


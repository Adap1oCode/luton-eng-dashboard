"use client";

import React from "react";

interface OptionsFlowDebugProps {
  stage: string;
  options: any;
  warehouses?: any[];
}

export default function OptionsFlowDebug({ stage, options, warehouses }: OptionsFlowDebugProps) {
  const optionsKeys = options ? Object.keys(options) : [];
  const hasWarehouses = options ? 'warehouses' in options : false;
  const warehousesInOptions = options?.warehouses;
  const warehousesLength = Array.isArray(warehousesInOptions) ? warehousesInOptions.length : 
                           Array.isArray(warehouses) ? warehouses.length : 0;
  const warehousesIsArray = Array.isArray(warehousesInOptions) || Array.isArray(warehouses);
  
  // Determine color based on whether warehouses are present and valid
  const hasValidWarehouses = hasWarehouses && warehousesLength > 0 && warehousesIsArray;
  const borderColor = hasValidWarehouses ? "border-green-500" : "border-red-500";
  const bgColor = hasValidWarehouses ? "bg-green-50" : "bg-red-50";
  const textColor = hasValidWarehouses ? "text-green-700" : "text-red-700";
  const titleIcon = hasValidWarehouses ? "✅" : "❌";

  return (
    <div className={`mb-4 rounded-lg border-2 ${borderColor} ${bgColor} p-4`}>
      <h3 className={`font-bold ${textColor} mb-2`}>{titleIcon} {stage}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <strong>Options Keys:</strong> {optionsKeys.length > 0 ? optionsKeys.join(", ") : "none"}
        </div>
        <div>
          <strong>Has "warehouses" key:</strong> {hasWarehouses ? "✅ YES" : "❌ NO"}
        </div>
        <div>
          <strong>Warehouses Length:</strong> {warehousesLength}
        </div>
        <div>
          <strong>Warehouses Is Array:</strong> {warehousesIsArray ? "✅ YES" : "❌ NO"}
        </div>
        <div className="col-span-2">
          <strong>Warehouses Sample (first 2):</strong>
          <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
            {JSON.stringify(
              (warehousesInOptions ?? warehouses ?? []).slice(0, 2), 
              null, 
              2
            )}
          </pre>
        </div>
        <div className="col-span-2">
          <strong>Full Options Object:</strong>
          <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
            {JSON.stringify(options, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}


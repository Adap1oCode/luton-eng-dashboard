import React from "react";

interface RoleRow {
  role_code: string;
  status: string;
  is_active: boolean;
  warehouses: string[];
  role_name: string;
}

interface ExpandedRowDetailsProps {
  role: RoleRow;
  colSpan: number;
}

export const ExpandedRowDetails: React.FC<ExpandedRowDetailsProps> = ({ role, colSpan }) => {
  return (
    <tr className="bg-gray-50 dark:bg-gray-800">
      <td colSpan={colSpan} className="p-4">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Role Details: {role.role_name}</h4>

          <div className="overflow-x-auto">
            <table className="w-2xl border border-gray-200 text-sm dark:border-gray-500">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">Role Code</th>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">Status</th>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">Active</th>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                    Warehouses Count
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                    Associated Warehouses
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{role.role_code}</td>
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{role.status}</td>
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{role.is_active ? "Yes" : "No"}</td>
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{role.warehouses.length}</td>
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{role.warehouses.join(", ")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
};

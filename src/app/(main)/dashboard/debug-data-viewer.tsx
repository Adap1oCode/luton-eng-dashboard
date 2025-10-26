// Debug component to help you see what data is being passed to the data viewer
"use client";

import { useEffect, useState } from 'react';

interface DebugDataViewerProps {
  data: any[];
  title?: string;
}

export function DebugDataViewer({ data, title = "Data Viewer" }: DebugDataViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    console.log(`🔍 [${title}] Data received:`, {
      length: data?.length || 0,
      firstItem: data?.[0],
      lastItem: data?.[data?.length - 1],
      allData: data
    });
  }, [data, title]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-600"
      >
        Debug Data ({data?.length || 0} items)
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-white border rounded shadow-lg p-4 max-w-md max-h-96 overflow-auto">
          <h3 className="font-bold mb-2">{title}</h3>
          <div className="text-sm">
            <p><strong>Count:</strong> {data?.length || 0}</p>
            <p><strong>First item:</strong></p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(data?.[0], null, 2)}
            </pre>
            <p><strong>Sample items (first 3):</strong></p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(data?.slice(0, 3), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}


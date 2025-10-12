import React from "react";

interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-md bg-green-600 px-4 py-2 text-white shadow-lg">{message}</div>
  );
};

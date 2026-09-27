import React from "react";
import { AlertCircle, CheckCircle2, Clock, X, AlertTriangle } from "lucide-react";

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toasts-container">
      {toasts.map((toast) => {
        let icon = <AlertCircle size={20} color="#06b6d4" />;
        let typeClass = "toast-info";

        if (toast.type === "success") {
          icon = <CheckCircle2 size={20} color="#10b981" />;
          typeClass = "toast-success";
        } else if (toast.type === "warning") {
          icon = <AlertTriangle size={20} color="#f59e0b" />;
          typeClass = "toast-warning";
        } else if (toast.type === "error") {
          icon = <AlertCircle size={20} color="#f43f5e" />;
          typeClass = "toast-error";
        } else if (toast.type === "pending") {
          icon = <Clock size={20} color="#06b6d4" className="animate-spin" />;
          typeClass = "toast-info";
        }

        return (
          <div key={toast.id} className={"toast " + typeClass}>
            {icon}
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-desc">{toast.message}</div>
              {toast.txHash && (
                <div className="toast-tx-link" title={toast.txHash}>
                  Tx: {toast.txHash.slice(0, 10)}...{toast.txHash.slice(-8)}
                </div>
              )}
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

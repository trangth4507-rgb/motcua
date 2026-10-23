import React from 'react';
import { KeyRound, X, ExternalLink, Info } from 'lucide-react';
import { VERCEL_ENV_SETTINGS_URL } from '../lib/auth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mật khẩu Admin được lưu trong biến môi trường ADMIN_PASSWORD trên Vercel,
 * nên không thể đổi trực tiếp từ trình duyệt. Hộp thoại này hướng dẫn cách đổi.
 */
export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    <>
      Mở trang <strong>Environment Variables</strong> của dự án trên Vercel (nút bên dưới).
    </>,
    <>
      Tìm biến <code className="px-1 py-0.5 rounded bg-slate-100 font-mono text-[11px]">ADMIN_PASSWORD</code>, bấm{' '}
      <strong>Edit</strong> và nhập mật khẩu mới rồi <strong>Save</strong>.
    </>,
    <>
      Vào tab <strong>Deployments</strong>, chọn bản mới nhất → <strong>Redeploy</strong> để áp dụng.
    </>,
    <>Mọi thiết bị đang đăng nhập sẽ tự đăng xuất; đăng nhập lại bằng mật khẩu mới.</>,
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Đổi mật khẩu Quản trị (Admin)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Mật khẩu Admin được lưu an toàn trên máy chủ Vercel, không nằm trong trình duyệt, nên được đổi
              trong trang quản lý dự án.
            </span>
          </div>

          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <a
              href={VERCEL_ENV_SETTINGS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <span>Mở cài đặt Vercel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

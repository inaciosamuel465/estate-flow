import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-slate-950 text-white hover:bg-slate-800 shadow-sm',
  secondary: 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', icon, className = '', children, ...props }) => (
  <button
    {...props}
    className={[
      'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all',
      'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
      variantClasses[variant],
      className,
    ].join(' ')}
  >
    {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
    <span className="min-w-0 break-words text-center leading-tight">{children}</span>
  </button>
);

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const Field: React.FC<FieldProps> = ({ label, hint, className = '', ...props }) => (
  <label className="block space-y-1.5">
    <span className="block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
    <input
      {...props}
      className={[
        'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all',
        'placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 disabled:bg-slate-100 disabled:text-slate-500',
        className,
      ].join(' ')}
    />
    {hint && <span className="block text-xs leading-relaxed text-slate-400">{hint}</span>}
  </label>
);

export const Modal: React.FC<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}> = ({ open, title, description, onClose, children, widthClass = 'max-w-2xl' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full ${widthClass} overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-black/20`}
        onClick={event => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur">
          <div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
          </div>
          <Button type="button" variant="ghost" icon="close" className="size-10 shrink-0 px-0" onClick={onClose} aria-label="Fechar" />
        </div>
        {children}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
    <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </div>
    <h3 className="font-black text-slate-900">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
  </div>
);

export const SectionHeader: React.FC<{ eyebrow?: string; title: string; description?: string }> = ({ eyebrow, title, description }) => (
  <div className="mb-8">
    {eyebrow && <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>}
    <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{title}</h2>
    {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">{description}</p>}
  </div>
);


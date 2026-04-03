import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const showAlert = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'alert',
        title: options.title || 'Notice',
        message: String(message || ''),
        confirmText: options.confirmText || 'OK',
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        title: options.title || 'Please Confirm',
        message: String(message || ''),
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        resolve,
      });
    });
  }, []);

  const closeWith = useCallback((result) => {
    setDialog((prev) => {
      if (!prev) return prev;
      prev.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (dialog.type === 'confirm') {
          closeWith(false);
        } else {
          closeWith(true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, closeWith]);

  const contextValue = useMemo(
    () => ({ showAlert, showConfirm }),
    [showAlert, showConfirm]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => closeWith(dialog.type === 'confirm' ? false : true)}
            aria-label="Close dialog"
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-5">
              <div className="flex items-center gap-3">
                {dialog.type === 'confirm' ? (
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
                ) : (
                  <InformationCircleIcon className="h-6 w-6 text-teal-600" />
                )}
                <h3 className="text-lg font-bold text-slate-800">{dialog.title}</h3>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-7 text-slate-600">{dialog.message}</p>

              <div className="mt-6 flex justify-end gap-3">
                {dialog.type === 'confirm' && (
                  <button
                    type="button"
                    onClick={() => closeWith(false)}
                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    {dialog.cancelText || 'Cancel'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => closeWith(true)}
                  className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {dialog.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
};

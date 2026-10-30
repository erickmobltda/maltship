import * as React from 'react';

type Toast = { id: number; title: string; description?: string; variant?: 'default' | 'error' | 'success' };

let listeners: Array<(t: Toast[]) => void> = [];
let state: Toast[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(state);
}

export const toast = {
  show(t: Omit<Toast, 'id'>) {
    const id = nextId++;
    state = [...state, { id, ...t }];
    emit();
    setTimeout(() => toast.dismiss(id), 4000);
  },
  success(title: string, description?: string) {
    this.show({ title, description, variant: 'success' });
  },
  error(title: string, description?: string) {
    this.show({ title, description, variant: 'error' });
  },
  dismiss(id: number) {
    state = state.filter((x) => x.id !== id);
    emit();
  },
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>(state);
  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-3 pt-safe sm:left-auto sm:right-4 sm:top-4 sm:translate-x-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            'pointer-events-auto animate-fade-in rounded-lg border bg-card p-4 shadow-lg ' +
            (t.variant === 'error'
              ? 'border-destructive/40'
              : t.variant === 'success'
                ? 'border-success/40'
                : 'border-border')
          }
          onClick={() => toast.dismiss(t.id)}
        >
          <div className="text-sm font-semibold">{t.title}</div>
          {t.description ? <div className="mt-1 text-sm text-muted-foreground">{t.description}</div> : null}
        </div>
      ))}
    </div>
  );
}

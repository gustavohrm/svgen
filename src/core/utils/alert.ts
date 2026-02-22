type AlertType = "success" | "error" | "warning" | "info";

interface AlertOptions {
  message: string;
  type: AlertType;
  duration?: number;
}

function getOrCreateContainer(): HTMLDivElement {
  let container = document.getElementById("global-alert-container") as HTMLDivElement;
  if (!container) {
    container = document.createElement("div");
    container.id = "global-alert-container";
    container.className = "fixed bottom-8 right-8 z-50 flex flex-col gap-3 pointer-events-none";
    document.body.appendChild(container);
  }
  return container;
}

function createAlertElement(options: AlertOptions): HTMLDivElement {
  const div = document.createElement("div");

  let classes =
    "px-4 py-3 rounded-lg border border-border text-sm font-medium pointer-events-auto min-w-[280px] shadow-lg flex items-center transition-all ";

  const themeColors = {
    success: "bg-surface text-emerald-500 border-emerald-500/20",
    error: "bg-surface text-rose-500 border-rose-500/20",
    warning: "bg-surface text-amber-500 border-amber-500/20",
    info: "bg-surface text-primary border-primary/20",
  };

  classes += themeColors[options.type];

  div.className = classes;
  div.textContent = options.message;

  return div;
}

function removeAlert(alertElement: HTMLDivElement) {
  const container = getOrCreateContainer();
  if (container.contains(alertElement)) {
    container.removeChild(alertElement);
  }
}

export function showAlert(options: AlertOptions) {
  const container = getOrCreateContainer();
  const alertElement = createAlertElement(options);

  if (container.children.length >= 5) {
    if (container.firstElementChild) {
      removeAlert(container.firstElementChild as HTMLDivElement);
    }
  }

  container.appendChild(alertElement);

  setTimeout(() => {
    removeAlert(alertElement);
  }, options.duration || 4000);
}

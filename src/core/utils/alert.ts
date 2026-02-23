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
    "px-4 py-3 rounded-lg border text-sm font-medium pointer-events-auto min-w-[280px] flex items-center transition-all ";

  const themeColors = {
    success: "bg-background text-emerald-500 border-emerald-500/20",
    error: "bg-background text-rose-500 border-rose-500/20",
    warning: "bg-background text-amber-500 border-amber-500/20",
    info: "bg-background text-text border-border/50",
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

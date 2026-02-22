type AlertType = "success" | "error" | "warning" | "info";

interface AlertOptions {
  message: string;
  type: AlertType;
  duration?: number;
}

const alertColors = {
  success: "bg-emerald-500 text-white",
  error: "bg-rose-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-primary text-white",
};

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
    "px-6 py-4 rounded-xl border-4 border-neutral-900 text-sm font-black uppercase tracking-widest pointer-events-auto min-w-[300px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ";

  classes += alertColors[options.type];

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

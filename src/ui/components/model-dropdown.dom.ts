export function setDropdownOpenState(
  menu: HTMLElement,
  icon: HTMLElement | null,
  isOpen: boolean,
): void {
  menu.classList.toggle("hidden", !isOpen);
  menu.classList.toggle("flex", isOpen);
  if (icon) {
    icon.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
  }
}

export function activateProviderPane(root: HTMLElement, paneId: string): void {
  root.querySelectorAll(".provider-tab").forEach((tab) => {
    const isTarget = (tab as HTMLElement).dataset.tabTarget === paneId;
    tab.classList.toggle("text-text", isTarget);
    tab.classList.toggle("bg-surface-hover/30", isTarget);
    tab.classList.toggle("text-text-muted", !isTarget);
    tab.classList.toggle("hover:text-text", !isTarget);
    tab.classList.toggle("hover:bg-surface-hover/50", !isTarget);
  });

  root.querySelectorAll(".provider-pane").forEach((pane) => {
    const isTarget = pane.id === paneId;
    pane.classList.toggle("flex", isTarget);
    pane.classList.toggle("hidden", !isTarget);
  });
}

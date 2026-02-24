/**
 * Set visibility of a dropdown menu and rotate an optional icon to reflect the open state.
 *
 * @param menu - The dropdown element whose visibility classes ("hidden"/"flex") will be toggled
 * @param icon - Optional icon element to rotate to 180° when open or 0° when closed
 * @param isOpen - Whether the dropdown should be open
 */
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

/**
 * Activate the provider pane identified by `paneId` and update tab styles to reflect the active tab.
 *
 * Updates elements with class `provider-tab` by marking the tab whose `data-tab-target` equals `paneId` as active and marking others as inactive. Shows the `.provider-pane` whose `id` equals `paneId` and hides the other panes.
 *
 * @param root - Root element containing `.provider-tab` and `.provider-pane` elements
 * @param paneId - The `id` of the pane to activate; tabs match this via their `data-tab-target` attribute
 */
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

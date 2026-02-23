export class AppModal extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute("modal-title") || "Modal Title";
    const modalId = this.getAttribute("modal-id") || "";
    const closeBtnId = this.getAttribute("close-btn-id") || `close-${modalId}-btn`;
    const titleId = this.getAttribute("title-id") || `${modalId}-title`;

    // Move children to a fragment temporarily
    const fragment = document.createDocumentFragment();
    while (this.firstChild) {
      fragment.appendChild(this.firstChild);
    }

    this.innerHTML = `
        <div
          id="${modalId}"
          class="fixed inset-0 z-50 items-center justify-center p-4 bg-background/80 hidden backdrop-blur-md transition-all duration-300"
        >
          <div
            class="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden scale-100 flex flex-col"
          >
            <div class="px-8 py-6 border-b border-border flex items-center justify-between">
              <h3 class="text-lg font-semibold text-text" id="${titleId}">${title}</h3>
              <button
                id="${closeBtnId}"
                type="button"
                class="p-2 text-text-secondary hover:text-text transition-all rounded-lg hover:bg-surface-hover cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-x"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div class="modal-body-container flex-1"></div>
          </div>
        </div>
    `;

    this.querySelector(".modal-body-container")!.appendChild(fragment);
  }
}

customElements.define("app-modal", AppModal);

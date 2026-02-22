export class AppHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  private isActive(path: string) {
    const activePath = window.location.pathname;
    if (path === "/" && (activePath === "/" || activePath === "/index.html")) return true;
    if (path !== "/" && activePath.includes(path)) return true;
    return false;
  }

  render() {
    this.innerHTML = `
      <style>
        .nav-container {
          max-width: 1024px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1.5rem;
          padding-right: 1.5rem;
        }

        .nav-content {
          display: flex;
          align-items: center;
          height: 4rem;
          justify-content: space-between;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 8rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1;
          margin: 0;
          font-family: inherit;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          border: 1px solid transparent;
          outline: none;
          background: transparent;
          font-family: inherit;
        }

        .nav-item:hover {
          color: var(--text);
          background-color: var(--surface-hover);
        }

        .nav-item.active {
          color: var(--text);
          background-color: var(--surface-hover);
          border-color: var(--border);
        }

        .icon {
          width: 1rem;
          height: 1rem;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }

        .social-container {
          width: 8rem;
          display: none;
          align-items: center;
          justify-content: flex-end;
        }

        @media (min-width: 768px) {
          .social-container {
            display: flex;
          }
        }

        .social-link {
          color: var(--text-secondary);
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
        }
        
        .social-link:hover {
          color: var(--text);
        }
          
        .social-icon {
          width: 1.25rem;
          height: 1.25rem;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }
      </style>
      <nav class="bg-surface border-b border-border sticky top-0 z-30">
        <div class="nav-container">
          <div class="nav-content">
            <div class="logo-container">
              <h1 class="logo-text">SVGEN</h1>
            </div>

            <div class="nav-links">
              <a href="/" class="nav-item ${this.isActive("/") ? "active" : ""}">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  <path d="M5 3v4"/>
                  <path d="M19 17v4"/>
                  <path d="M3 5h4"/>
                  <path d="M17 19h4"/>
                </svg>
                <span>Generation</span>
              </a>
              <a href="/settings/" class="nav-item ${this.isActive("/settings") ? "active" : ""}">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24">
                  <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/>
                  <path d="m21 2-9.6 9.6"/>
                  <circle cx="7.5" cy="15.5" r="5.5"/>
                </svg>
                <span>API Keys</span>
              </a>
              <a href="/gallery/" class="nav-item ${this.isActive("/gallery") ? "active" : ""}">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                <span>Gallery</span>
              </a>
            </div>

            <div class="social-container">
              <a
                href="https://github.com/gustavohrm/svgen"
                target="_blank"
                rel="noopener noreferrer"
                class="social-link"
                title="View Source on GitHub"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="social-icon" viewBox="0 0 24 24">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </nav>
    `;
  }
}

customElements.define("app-header", AppHeader);

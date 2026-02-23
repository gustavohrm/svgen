export type Listener<T> = (state: T) => void;

export class Store<T> {
  private state: T;
  private listeners: Set<Listener<T>>;

  constructor(initialState: T) {
    this.state = initialState;
    this.listeners = new Set();
  }

  /** Gets the current state */
  get(): T {
    return this.state;
  }

  /** Updates the state and notifies listeners */
  set(update: Partial<T> | ((prev: T) => Partial<T>)): void {
    const changes = typeof update === "function" ? update(this.state) : update;
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    // Optionally trigger immediately with current state
    // listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

/** Helper to create a store */
export function createStore<T>(initialState: T): Store<T> {
  return new Store(initialState);
}

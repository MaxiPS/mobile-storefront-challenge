export function createStore(initialSnapshot) {
  let snapshot = Object.freeze(initialSnapshot);
  const listeners = new Set();

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return snapshot;
  }

  function publish(patch) {
    const next = { ...snapshot, ...patch };
    if (Object.keys(next).every((key) => Object.is(next[key], snapshot[key]))) {
      return snapshot;
    }
    snapshot = Object.freeze(next);
    listeners.forEach((listener) => listener());
    return snapshot;
  }

  return { subscribe, getSnapshot, publish };
}

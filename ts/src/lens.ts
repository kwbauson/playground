type Lens<S, T> = {
  get(source: S): T
  put(source: S, value: T): S
  to<U>(other: Lens<T, U>): Lens<S, U>
  of<U>(other: Lens<U, S>): Lens<U, T>
}

function make<S, T>(
  get: Lens<S, T>['get'],
  put: Lens<S, T>['put'],
): Lens<S, T> {
  const to: Lens<S, T>['to'] = other => {
    get: s => other.get(get(s)),
    put: (s, v) => put(s, other.put(get(s), v))
  }
  return {
    get,
    put,
    to,
    of: null as any
  }
}

function prop<S, T, K extends keyof T>(a: Lens<S, T>, key: K): Lens<S, T[K]> {
  return to(a, make(s => s[key], (s, v) => ({ ...s, [key]: v })))
}


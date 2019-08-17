import React, { useState, useEffect, Dispatch, SetStateAction } from 'react'

type Lens<T> = {
  get(): T
  set(value: T): void
  update(fn: (value: T) => T): void
  map<U>(get: (value: T) => U, put: (value: T) => (x: U) => T): Lens<U>
  select<K extends keyof T>(...keys: K[]): Lens<T[K]>
}

export function createLens<T>(get: () => T, set: (value: T) => void) {
  const lens: Lens<T> = {
    get,
    set,
    update: fn => lens.set(fn(lens.get())),
    map: (get, put) =>
      createLens(() => get(lens.get()), x => lens.set(put(lens.get())(x))),
    select: key =>
      lens.map(value => value[key], value => x => ({ ...value, [key]: x })),
  }
  return lens
}

export function connected<T>(
  lens: Lens<T>,
  Component: React.ComponentType<T>,
): Lens<{ Connected: React.ComponentType; lens: Lens<T> }> {
  const initialState = lens.get()
  let state = lens.get()
  let setState: null | Dispatch<SetStateAction<T>> = null
  return lens.map(
    value => {
      function Connected() {
        ;[state, setState] = useState(initialState)
        value = state
        useEffect(() => {
          return () => {
            setState = null
          }
        })
        return <Component {...value} />
      }
      return { Connected, lens }
    },
    value => () => {
      setState && setState(value)
      return value
    },
  )
}

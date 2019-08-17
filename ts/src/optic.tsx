import React from 'react'

export type Optic<S, T> = {
  get: (s: S) => T
  put: (s: S, t: T) => S
  lens: LensFn<S, T>
  key: KeyFn<S, T>
}

type LensFn<S, T> = <U>(get: (t: T) => U, put: (t: T, u: U) => T) => Optic<S, U>
type KeyFn<S, T> = <K extends keyof T>(key: K) => Optic<S, T[K]>

function createLens<S, T>(
  get: (s: S) => T,
  put: (s: S, t: T) => S,
): Optic<S, T> {
  const lens: LensFn<S, T> = (g, p) =>
    createLens(s => g(get(s)), (s, u) => put(s, p(get(s), u)))
  const key: KeyFn<S, T> = key =>
    lens(s => s[key], (s, u) => ({ ...s, [key]: u }))
  return { get, put, lens, key }
}

type Store<T> = {
  lens<U>(get: (value: T) => U, put: (value: T, x: U) => T): Store<U>
  prism<U>(get: (value: T) => null | U, put: (value: T, x: U) => T): Store<U>
  key<K extends keyof T>(key: K): Store<T[K]>
  map<U>(fn: (value: T) => U): () => U
}

type State = {
  foo: number
  bar: string
  baz: {
    quz: boolean
  }
}

declare const store: Store<State>

const foo = store.key('foo')
const ViewFoo = foo.map(x => <div>{x + 10}</div>)

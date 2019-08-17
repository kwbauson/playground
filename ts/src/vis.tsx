import React from 'react'

type Get<S, T> = (source: S) => T
type Put<S, T> = (source: S, value: T) => S

type Optic<S, T> = {
  iso<U>(get: Get<T, U>, set: Get<U, T>): Optic<S, U>
  lens<U>(get: Get<T, U>, put: Put<T, U>): Optic<S, U>
  keyOf<K extends keyof T>(key: K): Optic<S, T[K]>
  view<U>(fn: (state: State<T>) => U): (state: SimpleState<T>) => U
}

function opticOf<S>(): Optic<S, S> {
  return opticFrom(x => x, (_, x) => x)
}

function opticFrom<S, T>(get: Get<S, T>, put: Put<S, T>): Optic<S, T> {
  const result: Optic<S, T> = {
    iso: (g, s) => lens(g, (_, x) => s(x)),
    lens: (g, p) =>
      opticFrom(
        source => g(get(source)),
        (source, value) => put(source, p(get(source), value)),
      ),
    keyOf: key =>
      lens(
        source => source[key],
        (source, value) => ({
          ...source,
          [key]: value,
        }),
      ),
  }
  const { lens } = result
  return result
}

type Lens<S, T> = <U>(get: Get<T, U>, put: Put<T, U>) => Lens<S, U>

function lensOf<S>(): Lens<S, S> {
  return lensFrom(x => x, (_, x) => x)
}

function lensFrom<S, T>(get: Get<S, T>, put: Put<S, T>): Lens<S, T> {
  return (g, p) =>
    lensFrom(
      source => g(get(source)),
      (source, value) => put(source, p(get(source), value)),
    )
}

type SimpleState<T> = { value: T; set(value: T): void }

type StateFn<F> = F extends (...args: infer A) => Optic<any, infer T>
  ? (...args: A) => State<T>
  : F

type State<T> = SimpleState<T> &
  { [P in keyof Optic<any, T>]: StateFn<Optic<any, T>[P]> } & {
    simple: SimpleState<T>
  }

const TextInput = opticOf<string>().view(state => (
  <input
    type="text"
    value={state.value}
    onChange={e => state.set(e.currentTarget.value)}
  />
))

type Person = {
  firstName: string
  lastName: string
  age: number
  married: boolean
  related: Person[]
  born: Date
}

const PersonForm = opticOf<Person>().view(state => (
  <div>
    <span>
      First Name: <TextInput {...state.keyOf('firstName').simple} />
    </span>
  </div>
))

const o1 = opticOf<Person>()
const o2 = o1.keyOf('born')
const o3 = o2.lens(
  x => ({
    hours: x.getHours(),
    minutes: x.getMinutes(),
    seconds: x.getSeconds(),
  }),
  (source, { hours, minutes, seconds }) => {
    const copy = new Date(source)
    copy.setHours(hours)
    copy.setMinutes(minutes)
    copy.setSeconds(seconds)
    return copy
  },
)
const o4 = o3.iso(
  x => [x.hours, x.minutes, x.seconds] as const,
  x => ({ hours: x[0], minutes: x[1], seconds: x[2] }),
)
const o5 = o4.iso(
  x => x.slice().reverse() as [number, number, number],
  x => x.slice().reverse() as [number, number, number],
)
const o6 = o1.lens(
  x => `${x.firstName} ${x.lastName}`,
  (source, fullName) => {
    const [firstName, lastName] = fullName.split(' ', 1) // FIXME
    return { ...source, firstName, lastName }
  },
)

export type Focal<S, T> = {
  get(s: S): T
  put(s: S, t: T): S
  // iso<U>(get: (t: T) => U, put: (u: U) => T): Focal<S, U>
  lens<U>(get: (t: T) => U, put: (t: T, u: U) => T): Focal<S, U>
  // prism<U>(get: (t: T) => U, put: (t: T, u: U) => Result<T>): Focal<S, U>
  getter<U>(get: (t: T) => U): Focal<S, U>
  // identity<U>(): Focal<U, U>
} & {
  prop<K extends keyof T>(key: K): Focal<S, T[K]>
}

// type Result<T> = null | { result: T }

function createFocal<S, T>(
  get: (s: S) => T,
  put: (s: S, t: T) => S,
): Focal<S, T> {
  const lens: Focal<S, T>['lens'] = (g, p) =>
    createFocal(s => g(get(s)), (s, u) => put(s, p(get(s), u)))
  return {
    get,
    put,
    // iso: (g, p) => createFocal(s => g(get(s)), (s, u) => put(s, p(u))),
    lens,
    // prism: (g, p) =>
    //   createFocal(
    //     s => g(get(s)),
    //     (s, u) => {
    //       const got = get(s)
    //       const res = p(got, u)
    //       return res ? put(s, res.result) : put(s, got)
    //     },
    //   ),
    getter: g => lens(s => g(s), s => s),
    prop: key => lens(s => s[key], (s, t) => ({ ...s, [key]: t })),
    // identity,
  }
}

function identity<S>(): Focal<S, S> {
  const id = (x: S) => x
  return createFocal(id, id)
}

type VDOM<S, T> = {
  tag: 'div' | 'p' | 'a' | 'input'
  value?: T
  update?: Focal<S, T>
  children?: VDOM<S, any>[]
}

type VFocal<T> = <S>(focal: Focal<S, T>) => Focal<S, VDOM<S, T>>

const Text: VFocal<string> = x => x.getter(value => ({ tag: 'p', value }))
const TextInput: VFocal<string> = x =>
  x.getter(value => ({ tag: 'input', value }))
declare function Div<S>(
  children: Focal<S, VDOM<any, any>>[],
): Focal<S, VDOM<any, any>>

type Person = {
  firstName: string
  lastName: string
}

const person = identity<Person>()

const fullName = person.lens(
  p => `${p.firstName} ${p.lastName}`,
  (p, s) => {
    const [firstName, ln] = s.split(' ')
    return { ...p, firstName, lastName: ln || '' }
  },
)

const Person = Div([
  TextInput(person.prop('firstName')),
  TextInput(person.prop('lastName')),
  Text(fullName),
])

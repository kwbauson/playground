export class Optic<S, A> {
  constructor(public get: Fn<[S], A>, public put: Fn<[A, S], S>) {}

  to<B>(get: Fn<[A], B>, put: Fn<[B, A], A>): Optic<S, B>
  to<B>(optical: Optical<A, B>): Optic<S, B>
  to<B>(...args: [Fn<[A], B>, Fn<[B, A], A>] | [Optical<A, B>]): Optic<S, B> {
    const other = args.length === 1 ? optic(...args) : optic(...args)
    return optic(
      x => other.get(this.get(x)),
      (x, y) => this.put(other.put(x, this.get(y)), y),
    )
  }

  of<T>(get: Fn<[T], S>, put: Fn<[S, T], T>): Optic<T, A>
  of<T>(optical: Optical<T, S>): Optic<T, A>
  of<T>(...args: [Fn<[T], S>, Fn<[S, T], T>] | [Optical<T, S>]): Optic<T, A> {
    const other = args.length === 1 ? optic(...args) : optic(...args)
    return other.to(this)
  }

  match<B>(
    matches: { [K in keyof Choice<S>]: Optical<Choice<S>[K], B> },
  ): Optic<S, B> {
    return {} as any
  }

  pick<KS extends (keyof A)[]>(...keys: KS): Optic<S, Pick<A, KS[number]>> {
    return {} as any
  }

  omit<KS extends (keyof A)[]>(...keys: KS): Optic<S, Omit<A, KS[number]>> {
    return {} as any
  }

  map<B>(optical: Optical<ValueType<A>, B>): Optical<S, B[]> {
    return {} as any
  }
  at: { [K in keyof A]: Optic<S, A[K]> } = {} as any

  enum: { [K in keyof Choice<S>]: Optic<Choice<S>[K], A> } = {} as any
  choice: { [K in keyof Choice<A>]: Optic<S, Maybe<Choice<A>[K]>> } = {} as any

  view<B>(f: Fn<[A], B>): Optic<S, B> {
    return this.to(
      x => f(x),
      (_, x) => x,
    )
  }
  infer<T>(): S extends undefined ? Optic<T, A> : Optic<T, never> {
    return this as any
  }
  default(data: S): Optic<Partial<S> | undefined, A> {
    return this.of(
      x => ({ ...data, ...x }),
      (x, y) => ({ ...y, ...x }),
    )
  }

  set(data: A): Optic<S, boolean> {
    return this.update(() => data)
  }
  update(fn: Fn<[A], A>): Optic<S, boolean> {
    return this.to<boolean>(
      () => false,
      (p, x) => (p ? fn(x) : x),
    )
  }
}

export type Optical<S, A> =
  | Optic<S, A>
  | ((attrs: { [K in keyof S]: Optic<S, S[K]> }) => Optical<S, A>)
  | NonEmpty<{ [K in keyof A]: Optical<S, A[K]> }>
  | Exclude<A, object | Function | Optic<any, any>>

export type Record<T> = keyof T extends never
  ? never
  : Exclude<Extract<T, object>, Function>
export type Choice<T> = Intersect<T extends any ? Single<T> : never>
type Single<T> = ChoiceType<T> extends never
  ? Intersect<keyof T> extends never
    ? never
    : T
  : {} extends T
  ? never
  : { [K in ChoiceType<T>]: undefined }
type ChoiceType<T> = string extends T
  ? never
  : T extends true
  ? 'true'
  : T extends false
  ? 'false'
  : Extract<T, number | symbol | keyof any>

export type NonEmpty<T> = T extends any ? ({} extends T ? never : T) : never
export type Fn<Args extends unknown[], Result> = (...args: Args) => Result
export type Maybe<T> = 'nothing' | { just: T }
export type Intersect<T> = (T extends any ? Fn<[T], void> : never) extends Fn<
  [infer I],
  void
>
  ? [unknown] extends [I]
    ? never
    : I
  : never
export type ValueOf<T> = T[keyof T]
export type ValueType<T> = [T] extends [(infer U)[]]
  ? U
  : [T] extends [{ [_ in any]: infer U }]
  ? U
  : never
export type Diff<T, U> = IfEq<keyof T, keyof U, {}, Omit<T, keyof U>>
export type Common<T, U> = Pick<T, Extract<keyof T, keyof U>>
type IfEq<T, U, A, B> = [T] extends [U] ? ([U] extends [T] ? A : B) : B

export type VNode =
  | { Stack: VNode[] }
  | { Row: VNode[] }
  | { Text: string }
  | { Input: string }
  | { NumberInput: number }
  | { Checkbox: { label: string; checked: boolean } }
  | { Button: { label: string; clicked: boolean } }
  | 'Break'
  | 'Divider'
  | 'Empty'

export function optic<S>(): Optic<S, S>
export function optic<S, A>(get: Fn<[S], A>, put: Fn<[A, S], S>): Optic<S, A>
export function optic<S, A>(optical: Optical<S, A>): Optic<S, A>
export function optic<S, A>(
  ...args: [] | [Fn<[S], A>, Fn<[A, S], S>] | [Optical<S, A>]
): Optic<S, A> {
  if (args.length === 0) {
    return identity as Optic<S, A>
  } else if (args.length === 2) {
    const [get, put] = args
    return new Optic(get, put)
  } else {
    const [optical] = args
    if (optical instanceof Optic) {
      return optical
    } else if (optical instanceof Function) {
      const { at } = optic<S>()
      return optic(optical(at))
    } else if (typeof optical === 'object' && optical !== null) {
      return {} as any
    } else {
      return optic<S, A>(
        _ => optical,
        (_, x) => x,
      )
    }
  }
}

export const identity = new Optic(
  x => x,
  (_, x) => x,
)

export function on<S>(f: (x: S) => S): Optic<S, boolean> {
  return optic<S>().to<boolean>(
    () => false,
    (b, s) => (b ? f(s) : s),
  )
}

export const {
  Stack,
  Row,
  Text,
  Input,
  NumberInput,
  Checkbox,
  Button,
  Break,
  Divider,
  Empty,
} = optic<VNode>().enum

type App = {
  newText: string
  todos: Todo[]
  filter: 'all' | 'active' | 'completed'
}

type Todo = {
  text: string
  done: boolean
}

const App = optic<App>()

export const AppView = App.default({
  newText: '',
  todos: [],
  filter: 'all',
}).to(({ newText, todos, filter }) =>
  Stack.of([
    Row.of([
      Input.of(newText),
      Button.of({
        label: 'Add Todo',
        clicked: App.pick('newText', 'todos').update(({ newText, todos }) => ({
          newText: '',
          todos: [...todos, { text: newText, done: false }],
        })),
      }),
    ]),
    Divider.infer(),
    Stack.of(
      todos.map(({ text, done }) =>
        Row.of([
          Input.of(text),
          Checkbox.of({ label: 'Done', checked: done }),
          Button.of({ label: 'Remove', clicked: false }),
        ]),
      ),
    ),
    Text.of(todos.view(x => `${x.length} left`)),
    Divider.infer(),
    Row.of([
      Button.of({ label: 'All', clicked: filter.set('all') }),
      Button.of({ label: 'Active', clicked: filter.set('active') }),
      Button.of({ label: 'Completed', clicked: filter.set('completed') }),
    ]),
  ]),
)

export declare class Optic<S, A> {
  get: Fn<[S], A>
  put: Fn<[A, S], S>

  to<B>(get: Fn<[A], B>, put: Fn<[B, A], A>): Optic<S, B>
  to<B>(optical: Optical<A, B>): Optic<S, B>

  of<T>(get: Fn<[T], S>, put: Fn<[S, T], T>): Optic<T, A>
  of<T>(optical: Optical<T, S>): Optic<T, A>

  pick<KS extends (keyof A)[]>(...keys: KS): Optic<S, Pick<A, KS[number]>>
  omit<KS extends (keyof A)[]>(...keys: KS): Optic<S, Omit<A, KS[number]>>

  map<B>(
    fn: Fn<
      [{ [K in keyof ValueType<A>]: Optic<S, ValueType<A>[K]> }],
      Optic<S, B>
    >,
  ): Optic<S, B[]>
  at: A extends any[]
    ? (index: number) => Optic<S, Maybe<A[number]>>
    : { [K in keyof A]: Optic<S, A[K]> }

  build: { [K in keyof Choice<S>]: Optic<Choice<S>[K], A> }
  choice: { [K in keyof Choice<A>]: Optic<S, Maybe<Choice<A>[K]>> }

  view<B>(f: Fn<[A], B>): Optic<S, B>
  infer<T>(): S extends undefined ? Optic<T, A> : Optic<T, never>
  default(data: S): Optic<Partial<S> | undefined, A>

  set(data: A): Optic<S, boolean>
  update(fn: Fn<[A], A>): Optic<S, boolean>
}

export type Optical<S, A> =
  | Optic<S, A>
  | Exclude<A, object | Function | Optic<any, any>>
  | ((attrs: { [K in keyof S]: Optic<S, S[K]> }) => Optical<S, A>)
  | NotEmpty<{ [K in keyof A]: Optical<S, A[K]> }>

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
  : number extends T
  ? never
  : symbol extends T
  ? never
  : T extends keyof any
  ? T
  : T extends true
  ? 'true'
  : T extends false
  ? 'false'
  : never

export type NotEmpty<T> = T extends any ? ({} extends T ? never : T) : never
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

export function optic<S>(): Optic<S, S> {
  return { build: {} } as any
}

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
} = optic<VNode>().build

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
          Checkbox.of({ label: text, checked: done }),
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

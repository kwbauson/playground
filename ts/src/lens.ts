export class Lens<S, A> {
  constructor(public lensFn: LensFn<S, A>) {
    this.lensFn = s => {
      const [a, as] = lensFn(s)
      return [a, a2 => (a2 === a ? s : as(a2))]
    }
  }

  static identity = new Lens(s => [s, s2 => s2])

  toLens<B>(lensFn: LensFn<A, B>): Lens<S, B> {
    return new Lens(s => {
      const [a, as] = this.lensFn(s)
      const [b, ba] = lensFn(a)
      return [b, b2 => as(ba(b2))]
    })
  }

  ofLens<T>(lensFn: LensFn<T, S>): Lens<T, A> {
    return new Lens(lensFn).to(this)
  }

  toIso<B>(get: Fn<A, B>, set: Fn<B, A>): Lens<S, B> {
    return this.toLens(a => [get(a), set])
  }

  ofIso<T>(get: Fn<T, S>, set: Fn<S, T>): Lens<T, A> {
    return this.ofLens(t => [get(t), set])
  }

  to<B>(lensable: Lensable<A, B, S, A>): Lens<S, B> {
    return this.toLens(lens<A, B>(lensable as any).lensFn)
  }

  of<T>(lensable: Lensable<T, S, A, S>): Lens<T, A> {
    return lens<T, S>(lensable as any).to(this)
  }

  view<B>(fn: Fn<A, B>): Lens<S, B> {
    return this.toLens(s => [fn(s), () => s])
  }

  involute(fn: Fn<A, A>): Lens<S, A> {
    return this.toIso(fn, fn)
  }

  update(fn: Fn<A, A>): Lens<S, boolean> {
    return this.toLens(a => [false as boolean, b => (b ? fn(a) : a)])
  }

  set(value: A): Lens<S, boolean> {
    return this.update(() => value)
  }

  pick<KS extends (keyof A)[]>(keys: KS): Lens<S, Pick<A, KS[number]>> {
    return this.toLens(a => [pick(a, keys), b => ({ ...a, ...b })])
  }

  omit<KS extends (keyof A)[]>(keys: KS): Lens<S, Omit<A, KS[number]>> {
    return this.toLens(a => [omit(a, keys), b => ({ ...a, ...b })])
  }

  map<B>(_lensable: Lensable<ValueType<A>, B, ValueType<A>, B>): Lens<S, B> {
    return lens<any>()
  }

  filter(
    _lensable: Lensable<ValueType<A>, boolean, ValueType<A>, boolean>,
  ): Lens<S, A> {
    return lens<any>()
  }

  reject(
    lensable: Lensable<ValueType<A>, boolean, ValueType<A>, boolean>,
  ): Lens<S, A> {
    return this.filter(lens(lensable as any).view(x => !x))
  }

  override<T extends Partial<S>>(
    _lensable: Lensable<S, T, S, T>,
  ): Lens<Diff<S, T>, A> {
    return lens<any>()
  }

  default<T extends Partial<S>>(
    _lensable: Lensable<S, T, S, T>,
  ): Lens<Diff<S, T> & Partial<Common<S, T>>, A> {
    return lens<any>()
  }

  get source(): Lens<S, A extends any ? { [K in keyof Choice<A>]: S } : never> {
    return lens<any>()
  }

  get remove(): Lens<S, boolean> {
    return lens<S, boolean>(false)
  }

  at: { [K in keyof Record<A>]: Lens<S, Record<A>[K]> } = getProxy(key =>
    this.toLens((a: any) => [a[key], ak => ({ ...a, [key]: ak })]),
  )

  choices: {
    [K in keyof Choice<S>]: Lens<Choice<S>[K], A>
  } = getProxy(key =>
    this.ofLens(ak => [
      { [key]: ak } as any,
      (s: any) => (key in s ? s[key] : ak),
    ]),
  )
}

function getProxy<T extends object>(get: (key: keyof T) => ValueOf<T>): T {
  return new Proxy<T>({} as any, {
    get(target, prop: keyof T) {
      if (!(prop in target)) target[prop] = get(prop)
      return target[prop]
    },
  })
}

function pick<T, KS extends (keyof T)[]>(
  value: T,
  keys: KS,
): Pick<T, KS[number]> {
  const result: any = {}
  for (const key in keys) {
    result[key] = (value as any)[key]
  }
  return result
}

function omit<T, KS extends (keyof T)[]>(
  value: T,
  keys: KS,
): Omit<T, KS[number]> {
  const result: any = {}
  const keyStrings = keys.map(x => x.toString())
  for (const key in value) {
    if (!keyStrings.includes(key)) {
      result[key] = value[key]
    }
  }
  return result
}

export type LensFn<S, A> = Fn<S, [A, Fn<A, S>]>
export type Lensable<S, A, T, B> =
  | Lens<S, A>
  | Lens<undefined, A>
  | Lens<unknown, A>
  | ((self: Lens<S, S>, parent: Lens<T, B>) => Lensable<S, A, T, B>)
  | Exclude<A, object | Function>
  | OfNested<Choice<S>, A, T>
  | ToNested<S, Record<A>, T, B>
type OfNested<S, A, T> = UnlessLensable<
  S,
  { [K in keyof S]: Lensable<S[K], A, S[K], T> }
>
type ToNested<S, A, T, B> = UnlessLensable<
  A,
  { [K in keyof A]: Lensable<S, A[K], T, B> }
>
type UnlessLensable<T, U> = [T] extends [Lens<any, any> | Function] ? never : U
type Record<T> = keyof T extends never
  ? never
  : Exclude<Extract<T, object>, Function>
type Choice<T> = NotUnknown<Intersect<T extends any ? Single<T> : never>>
type Single<T> = ChoiceType<T> extends never
  ? Intersect<keyof T> extends never
    ? unknown
    : T
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

type Fn<A, B> = (_: A) => B
type Intersect<T> = (T extends any
? Fn<T, void>
: never) extends Fn<infer I, void>
  ? I
  : never
type ValueOf<T> = T[keyof T]
type ValueType<T> = [T] extends [(infer U)[]]
  ? U
  : [T] extends [{ [_ in any]: infer U }]
  ? U
  : never
type NotUnknown<T> = [unknown] extends [T] ? never : T
type Diff<T, U> = IfEq<keyof T, keyof U, {}, Omit<T, keyof U>>
type Common<T, U> = Pick<T, Extract<keyof T, keyof U>>
type IfEq<T, U, A, B> = [T] extends [U] ? ([U] extends [T] ? A : B) : B

export function lens<S>(): Lens<S, S>
export function lens<S, A>(
  lensable: Lensable<S, A, unknown, unknown>,
): Lens<S, A>
export function lens<S, A, T, B>(
  ...args: [] | [Lensable<S, A, T, B>]
): Lens<S, S> | Lens<S, A> {
  if (args.length === 0) {
    return Lens.identity as Lens<S, S>
  } else {
    const [lensable] = args
    if (lensable instanceof Lens) {
      return lensable as Lens<S, A>
    } else if (typeof lensable === 'function') {
      const lensableFn = lensable as any // Fn<Lens<T, S>, Lensable<S, A, T, B>>
      return lens(lensableFn(lens())) as any
    } else {
      return lens<any>()
    }
  }
}

export type VNode =
  | { Div: VNode[] }
  | { Span: VNode[] }
  | { InlineText: string }
  | { Paragraph: string }
  | { Input: string }
  | { NumberInput: number }
  | { Button: { label: string; clicked: boolean } }
  | { Checkbox: { label: string; checked: boolean } }
  | { Pre: string }
  | 'Break'
  | 'Divider'
  | { Radio: { label: string; selected: boolean }[] }

export const {
  Div,
  Span,
  InlineText,
  Paragraph,
  Input,
  NumberInput,
  Button,
  Checkbox,
  Pre,
  Break,
  Divider,
  Radio,
} = lens<VNode>().choices

export const Inspect = lens()
  .view(x => JSON.stringify(x, null, 2))
  .to(Pre)

export type App = {
  name: string
  firstName: string
  lastName: string
  reversed: boolean
  viewing: 'all' | 'todo' | 'done'
  todos: Todo[]
  remoteTodo: RemoteData<Todo>
}

type Todo = {
  content: string
  done: boolean
}

type RemoteData<T, E = string> = {
  request: RemoteRequest
  response: RemoteResponse<T, E>
}

type RemoteRequest = string | ({ url: string } & RequestInit)

type RemoteResponse<T, E = string> =
  | 'unasked'
  | 'loading'
  | { success: T }
  | { failure: E }

export declare const Fetch: <T>() => Lens<RemoteData<T>, boolean>

export const App = lens<App>()
  .default({
    name: '',
    firstName: '',
    lastName: '',
    reversed: false,
    viewing: 'all',
    todos: [],
    remoteTodo: { request: '', response: 'unasked' },
  })
  .to(({ at: { name, reversed, viewing, todos, remoteTodo } }, _1) =>
    Div.of([
      Div.of([InlineText.of('Name:'), Input.of(name)]),
      Div.of([
        InlineText.of('Hello,'),
        InlineText.of(
          reversed.source.to({
            true: name.involute(x =>
              x
                .split('')
                .reverse()
                .join(''),
            ),
            false: name,
          }),
        ),
      ]),
      Checkbox.of({ label: 'reverse', checked: reversed }),
      Divider,
      Button.of({
        label: 'add todo',
        clicked: todos.update(xs => [{ content: '', done: false }, ...xs]),
      }),
      Radio.of([
        { label: 'All', selected: viewing.set('all') },
        { label: 'Todo', selected: viewing.set('todo') },
        { label: 'Done', selected: viewing.set('done') },
      ]),
      viewing.source
        .to({
          all: todos,
          todo: todos.reject(x => x.at.done),
          done: todos.filter(x => x.at.done),
        })
        .map(({ at: { content, done }, remove }) =>
          Div.of([
            Input.of(content),
            Checkbox.of({ label: 'done', checked: done }),
            Button.of({ label: 'remove', clicked: remove }),
          ]),
        ),
      Divider,
      remoteTodo.at.response.to({
        unasked: (_, from) =>
          Button.of({
            label: 'load todo!',
            clicked: Fetch<Todo>().of(remoteTodo.of(from)),
          }),
        loading: InlineText.of('loading todo...'),
        success: (todo, from) =>
          Div.of([
            todo.at.content.view(x => `loaded todo ${x}`).to(InlineText),
            Button.of({
              label: 'reload',
              clicked: Fetch<Todo>().of(remoteTodo.of(from)),
            }),
          ]),
        failure: InlineText.of('failed to load todo :('),
      }),
      Divider,
      Inspect,
    ]),
  )

export namespace Test {
  class School {
    name = String
    courses = [Course]
    admins = [User]
  }

  class Course {
    name = String
    description = String
    instructor = User
    projects = [Project]
    school = School
    lms = Lms
  }

  class Project {
    name = String
    course = Course
  }

  class User {
    name = String
    email = String
  }

  class Lms {
    name = String
    courses = [Course]
  }

  type InstanceType<T> = T extends new (...args: any) => infer U ? U : never
  type ModelInstance<T> = { [K in keyof T]: ModelAttribute<T[K]> }
  type ModelAttribute<T> = T extends BooleanConstructor
    ? boolean
    : T extends NumberConstructor
    ? number
    : T extends StringConstructor
    ? string
    : T extends (infer U)[]
    ? ModelInstance<InstanceType<U>>[]
    : ModelInstance<InstanceType<T>>

  declare const school: ModelInstance<School>
  school.courses[0].projects[0].name
}

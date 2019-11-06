export class Lens<S, A> {
  private constructor(public lensFn: LensFn<S, A>) {
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

  to<B>(lensable: Lensable<A, B>): Lens<S, B> {
    return this.toLens(lens(lensable).lensFn)
  }

  of<T>(lensable: Lensable<T, S>): Lens<T, A> {
    return lens(lensable).to(this)
  }

  view<B>(fn: Fn<A, B>): Lens<S, B> {
    return this.toLens(s => [fn(s), () => s])
  }

  update(fn: Fn<A, A>): Lens<S, boolean> {
    return this.toLens(a => [false as boolean, u => (u ? fn(a) : a)])
  }

  set(value: A): Lens<S, boolean> {
    return this.update(() => value)
  }

  pick<KS extends (keyof A)[]>(keys: KS): Lens<S, Pick<A, KS[number]>> {
    return this.to(Object.fromEntries(
      keys.map(k => [k, this.entries[k]]),
    ) as any)
  }

  omit<KS extends (keyof A)[]>(_keys: KS): Lens<S, Omit<A, KS[number]>> {
    return lens<any>()
  }

  map<B>(_lensable: Lensable<ValueType<A>, B>): Lens<S, B> {
    return lens<any>()
  }

  filter(_lensable: Lensable<ValueType<A>, boolean>): Lens<S, A> {
    return lens<any>()
  }

  reject(_lensable: Lensable<ValueType<A>, boolean>): Lens<S, A> {
    return lens<any>()
  }

  default(_lensable: Lensable<Partial<S>, A>): Lens<Partial<S>, A> {
    return lens<any>()
  }

  entries: { [K in keyof A]: Lens<S, A[K]> } = Lens.getProxy(key =>
    this.toLens(a => [a[key], ak => ({ ...a, [key]: ak })]),
  )

  remove: Lens<S, boolean> = lens<S>().to(false as boolean)

  switch<T, B>(_lensable: { [K in Choices<A>]: Lensable<T, B> }): Lens<T, B> {
    return lens<any>()
  }

  toChoice<B>(
    _choices: { [K in Choices<A>]: Lensable<Choose<A, K>, B> },
  ): Lens<S, B> {
    return lens<any>()
  }

  ofChoice<T>(
    _choices: { [K in Choices<S>]: Lensable<T, Choose<S, K>> },
  ): Lens<T, A> {
    return lens<any>()
  }

  choices: { [K in Choices<S>]: Lens<Choose<S, K>, A> } = Lens.getProxy(key =>
    // FIXME
    this.ofLens(ak => [
      { [key]: ak } as any,
      (s: any) => (key in s ? s[key] : ak),
    ]),
  )

  private static getProxy<T extends object>(
    get: (key: keyof T) => ValueOf<T>,
  ): T {
    return new Proxy<T>({} as any, {
      get(target, prop: keyof T) {
        if (!(prop in target)) target[prop] = get(prop)
        return target[prop]
      },
    })
  }
}

export type LensFn<S, A> = Fn<S, [A, Fn<A, S>]>
export type Lensable<S, A> =
  | Lens<S, A>
  | Lens<unknown, A>
  | ((self: Lens<S, S>) => Lensable<S, A>)
  | UnlessLensable<A, A | { [K in keyof A]: Lensable<S, A[K]> }>
type UnlessLensable<T, U> = T extends Lens<any, any> | Function ? never : U

type Choices<T> = Extract<
  T extends keyof any ? T : Intersection<keyof T>,
  keyof any
>

type Choose<T, K extends Choices<T>> = T extends K
  ? unknown
  : Extract<T, { [_ in K]: unknown }>[K]

type Fn<A, B> = (_: A) => B
type Intersection<T> = (T extends any ? Fn<T, void> : never) extends Fn<
  infer I,
  void
>
  ? I
  : never
type ValueOf<T> = T[keyof T]
type ValueType<T> = T extends (infer U)[]
  ? U
  : T extends { [_ in any]: infer U }
  ? U
  : never

export function lens<S>(): Lens<S, S>
export function lens<S, A>(lensable: Lensable<S, A>): Lens<S, A>
export function lens<S, A>(
  ...args: [] | [Lensable<S, A>]
): Lens<S, S> | Lens<S, A> {
  if (args.length === 0) {
    return Lens.identity as Lens<S, S>
  } else {
    const [lensable] = args
    if (lensable instanceof Lens) {
      return lensable as Lens<S, A>
    } else if (typeof lensable === 'function') {
      const fn = lensable as Fn<Lens<S, S>, Lensable<S, A>>
      return lens(fn(lens()))
    } else {
      // FIXME
      const value = lensable as A
      return lens<S>().view(() => value)
    }
  }
}

type VNode =
  | { Div: VNode[] }
  | { Span: VNode[] }
  | { InlineText: string }
  | { Paragraph: string }
  | { Input: string }
  | { NumberInput: number }
  | { Button: { label: string; clicked: boolean } }
  | { Checkbox: { label: string; checked: boolean } }
  | { Pre: string }
  | { Radio: { label: string; selected: boolean }[] }
  | 'Break'
  | 'Divider'

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
  Radio,
  Break,
  Divider,
} = lens<VNode>().choices

export const Inspect = lens()
  .view(x => JSON.stringify(x, null, 2))
  .to(Pre)

type App = {
  name: string
  firstName: string
  lastName: string
  reversed: boolean
  viewing: 'all' | 'todo' | 'done'
  todos: Todo[]
}

type Todo = {
  content: string
  done: boolean
}

export const App = lens<App>()
  .default({
    name: '',
    firstName: '',
    lastName: '',
    reversed: false,
    viewing: 'all',
    todos: [],
  })
  .to(({ entries: { name, reversed, viewing, todos } }) =>
    Div.of([
      Div.of([InlineText.of('Name:'), Input.of(name)]),
      Div.of([InlineText.of('Hello,'), InlineText.of(name)]),
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
      viewing
        .switch({
          all: todos,
          todo: todos.reject(x => x.entries.done),
          done: todos.filter(x => x.entries.done),
        })
        .map(({ entries: { content, done }, remove }) =>
          Div.of([
            Input.of(content),
            Checkbox.of({ label: 'done', checked: done }),
            Button.of({ label: 'remove', clicked: remove }),
          ]),
        ),
      Divider,
      Inspect,
    ]),
  )

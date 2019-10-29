/* @jsx createElement */

export class Optic<S, A> {
  constructor(public lensFn: LensFn<S, A>) {
    this.lensFn = s => {
      const [a, as] = lensFn(s)
      return [a, a2 => (a2 === a ? s : as(a2))]
    }
  }

  toLens<B>(lensFn: LensFn<A, B>): Optic<S, B> {
    return new Optic(s => {
      const [a, as] = this.lensFn(s)
      const [b, ba] = lensFn(a)
      return [b, b2 => as(ba(b2))]
    })
  }

  ofLens<T>(lensFn: LensFn<T, S>): Optic<T, A> {
    return new Optic(lensFn).to(this)
  }

  toIso<B>(get: Fn<A, B>, set: Fn<B, A>): Optic<S, B> {
    return this.toLens(a => [get(a), set])
  }

  ofIso<T>(get: Fn<T, S>, set: Fn<S, T>): Optic<T, A> {
    return this.ofLens(t => [get(t), set])
  }

  to<B>(pattern: Pattern<S, A, A, B>): Optic<S, B> {
    return this.toLens(this.fromPattern(pattern).lensFn)
  }

  of<T>(pattern: Pattern<S, A, T, S>): Optic<T, A> {
    return this.fromPattern(pattern).to(this)
  }

  view<B>(fn: Fn<A, B>): Optic<S, B> {
    return this.toLens(s => [fn(s), () => s])
  }

  update(fn: Fn<A, A>): Optic<S, boolean> {
    return this.toLens(a => [false as boolean, u => (u ? fn(a) : a)])
  }

  set(value: A): Optic<S, boolean> {
    return this.update(() => value)
  }

  entries: { [K in keyof A]: Optic<S, A[K]> } = Optic.getProxy(key =>
    this.toLens(a => [a[key], ak => ({ ...a, [key]: ak })]),
  )

  toMatch<B>(
    _obj: {
      [K in Choices<A>]: PatternTo<Choose<A, K>, B>
    },
  ): Optic<S, B> {
    return null as any
  }

  ofMatch<T>(
    _obj: {
      [K in Choices<S>]: PatternTo<T, Choose<S, K>>
    },
  ): Optic<T, A> {
    return null as any
  }

  choices: { [K in Choices<S>]: Optic<Choose<S, K>, A> } = Optic.getProxy(key =>
    // FIXME
    this.ofLens(ak => [
      { [key]: ak } as any,
      (s: any) => (key in s ? s[key] : ak),
    ]),
  )

  static id = new Optic(s => [s, s2 => s2])

  private fromPattern<T, B>(pattern: Pattern<S, A, T, B>): Optic<T, B> {
    if (pattern instanceof Optic) {
      return pattern
    } else if (Array.isArray(pattern)) {
      const opts = pattern.map(x => this.fromPattern(x))
      const arrayed = Optic.id as Optic<ItemType<B>[], B>
      const empty = id<T>().to<ItemType<B>[]>([])
      return opts
        .reduce(
          (a, o) =>
            id<T>().toLens(t => {
              const [bi, bit] = o.lensFn(t)
              const [bis, bits] = a.lensFn(t)
              return [
                [bi, ...bis],
                ([bi2, ...bis2]) => {
                  const t2 = bit(bi2)
                  return t === t2 ? t : bits(bis2)
                },
              ]
            }),
          empty,
        )
        .to(arrayed)
    } else if (typeof pattern === 'function') {
      const patternFn = pattern as Fn<Optic<S, A>, Pattern<S, A, T, B>>
      return this.fromPattern(patternFn(this))
    } else {
      const patternValue = pattern as B
      return id<T>().view(() => patternValue)
    }
  }

  private static getProxy<T extends object>(
    get: (key: keyof T) => T[keyof T],
  ): T {
    return new Proxy<T>({} as any, {
      get(target, prop: keyof T) {
        if (!(prop in target)) target[prop] = get(prop)
        return target[prop]
      },
    })
  }
}

type LensFn<S, A> = Fn<S, [A, Fn<A, S>]>
type Pattern<S, A, T, B> =
  | Optic<T, B>
  | ((self: Optic<S, A>) => Pattern<S, A, T, B>)
  | UnlessPattern<B, B | { [K in keyof B]: PatternTo<T, B[K]> }>
type PatternTo<S, B> = Pattern<S, S, S, B>
type Choices<T> = T extends any
  ? Extract<Intersection<keyof T>, keyof any>
  : never
type Choose<T, K extends Choices<T>> = Extract<T, { [_ in K]: unknown }>[K]
type UnlessPattern<T, U> = T extends Optic<any, any> | Function ? never : U

type Fn<A, B> = (_: A) => B
type Intersection<T> = (T extends any ? Fn<T, void> : never) extends Fn<
  infer I,
  void
>
  ? I
  : never
type ItemType<T> = T extends (infer U)[] ? U : never

export function id<S>(): Optic<S, S> {
  return Optic.id as Optic<S, S>
}

type VNode =
  | { Div: VNode[] }
  | { Span: VNode[] }
  | { InlineText: string }
  | { Paragraph: string }
  | { Input: string }
  | { NumberInput: number }
  | { Button: { label: string; clicked: boolean } }
  | { Checkbox: boolean }
  | { Break: null }
  | { Divider: null }
  | { Pre: string }

export const {
  Div,
  Span,
  InlineText,
  Paragraph,
  Input,
  NumberInput,
  Button,
  Checkbox,
  Break,
  Divider,
  Pre,
} = id<VNode>().choices

type App = {
  name: string
  viewing: 'all' | 'todo' | 'done'
  todos: Todo[]
}

type Todo = {
  content: string
  done: boolean
}

export const App = id<App>().to(({ entries: { name } }) =>
  Div.of([
    Div.of([InlineText.of('Name:'), Input.of(name)]),
    Div.of([InlineText.of('Hello,'), InlineText.of(name)]),
  ]),
)

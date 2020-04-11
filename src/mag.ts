import 'babel-polyfill'

export class Mag<S, T> {
  private constructor(get: MagGet<S, T>, impure = false) {
    this.get = impure
      ? get
      : s => {
          const [t, p] = get(s)
          return [t, t2 => (t2 === t ? s : p(t2))]
        }
  }

  static identity = new Mag<unknown, unknown>(s => [s, t => t])

  static ofImpure<S, T>(get: MagGet<S, T>): Mag<S, T> {
    return new Mag(get, true)
  }

  static of<S, T>(get: MagGet<S, T>): Mag<S, T>
  static of<S, T>(others: Mag<S, T>[]): Mag<S, T[]>
  static of<S, T>(arg: MagGet<S, T> | Mag<S, T>[]) {
    if (typeof arg === 'function') {
      return new Mag(arg)
    } else {
      return Mag.id<S>().toGet<T[]>(s => {
        const [ts, ps] = Mag.unpair(arg.map(m => m.get(s)))
        return [
          ts,
          ts2 =>
            ps.reduce((si, p, i) => (ts2[i] === ts[i] ? si : p(ts2[i])), s),
        ]
      })
    }
  }

  static id<S>(): Mag<S, S> {
    return Mag.identity.cast<S, S>()
  }

  static view<S, T>(fn: (other: S) => T): Mag<S, T> {
    return Mag.id<S>().view(fn)
  }

  static const<S, T>(other: T): Mag<S, T> {
    return Mag.id<S>().const(other)
  }

  static at<S, K extends keyof S>(key: K) {
    return Mag.id<S>().at(key)
  }

  static rev<S>(fn: (other: S) => S): Mag<S, S> {
    return Mag.id<S>().rev(fn)
  }

  readonly get: MagGet<S, T>

  ofGet<U>(get: MagGet<U, S>): Mag<U, T> {
    return Mag.of(get).to(this)
  }

  replace(get: MagGet<S, S>): Mag<S, T> {
    return this.ofGet(get)
  }

  // FIXME MagFrom makes invalid things typecheck
  of<U>(other: MagFrom<U, S>): Mag<U, T>
  of<U>(this: Mag<ItemType<S>[], T>, other: Mag<U, ItemType<S>>[]): Mag<U, T>
  of<U>(fn: (make: MagMake<U>) => Mag<U, S>): Mag<U, T>
  of<U>(
    this: Mag<ItemType<S>[], T>,
    fn: (make: MagMake<U>) => Mag<U, ItemType<S>>[],
  ): Mag<U, T>
  of<U>(
    arg:
      | Mag<U, ItemType<S>>[]
      | ((make: MagMake<U>) => Mag<U, S>)
      | ((make: MagMake<U>) => Mag<U, ItemType<S>>[])
      | MagFrom<U, S>,
  ) {
    if (arg instanceof Mag) {
      return arg.to(this)
    } else if (Array.isArray(arg)) {
      return this.of(Mag.of(arg).to(Mag.unArray()))
    } else if (typeof arg === 'function') {
      let other: Mag<U, S>
      return this.ofGet<U>(s => {
        if (!other) {
          const res = arg(Mag.make(s))
          other = Array.isArray(res) ? Mag.of(res).to(Mag.unArray()) : res
        }
        return other.get(s)
      })
    } else if (typeof arg === 'object' && arg !== null) {
      const mags = Mag.mapValues(arg as any, v => Mag.id<any>().of(v))
      const entries = Mag.entries(mags)
      return this.ofGet<any>(s => {
        const mapped = Mag.mapValues(mags, v => v.get(s))
        const res = Mag.mapValues(mapped, x => x[0])
        return [
          res,
          (t: any) =>
            entries.reduce((si, [k, m]: any) => m.get(si)[1](t[k]), s),
          // FIXME this should be extracted somehow
        ]
      })
    } else {
      return this.castOf<any>().of(Mag.const(arg))
    }
  }

  ofView<U>(fn: (source: U) => S): Mag<U, T> {
    return this.of(Mag.id<U>().view(fn))
  }

  castOf<U>(): Mag<U, T> {
    return (this as unknown) as Mag<U, T>
  }

  // FIXME exclude invalid K values?
  extract<K extends keyof any>(key: K): Mag<Match<S, K>, T> {
    return this.ofGet(s => [
      { [key]: s } as any,
      (t: any) =>
        typeof t === 'object' && t !== null && key in t ? t[key] : s,
    ])
  }

  instance<U extends { new (...args: any): S }>(
    constructor: U,
    fallback?: (value: S) => InstanceType<U>,
  ): Mag<InstanceType<U>, T> {
    function predicate(value: S): value is InstanceType<U> {
      return value instanceof constructor
    }
    return this.is(predicate, fallback)
  }

  if(fn: (value: S) => boolean, fallback?: (value: S) => S): Mag<S, T> {
    function predicate(value: S): value is S {
      return fn(value)
    }
    return this.is(predicate, fallback)
  }

  is<U extends S>(
    fn: (value: S) => value is U,
    fallback?: (value: S) => U,
  ): Mag<U, T> {
    if (fallback) {
      return this.ofGet<U>(s => [s, t => (fn(t) ? t : fallback(s))])
    } else {
      return this.ofGet<U>(s => [s, t => (fn(t) ? t : s)])
    }
  }

  toGet<U>(get: MagGet<T, U>): Mag<S, U> {
    return Mag.of(s => {
      const [r1, p1] = this.get(s)
      const [r2, p2] = get(r1)
      return [r2, o => p1(p2(o))]
    })
  }

  to<U>(other: Mag<T, U>): Mag<S, U>
  to<U>(others: Mag<T, U>[]): Mag<S, U[]>
  to<U>(fn: (self: Mag<S, T>) => Mag<T, U>): Mag<S, U>
  to<U>(fn: (self: Mag<S, T>) => Mag<T, U>[]): Mag<S, U[]>
  to<U>(
    arg:
      | Mag<T, U>
      | Mag<T, U>[]
      | ((self: Mag<S, T>) => Mag<T, U>)
      | ((self: Mag<S, T>) => Mag<T, U>[]),
  ): Mag<S, U> | Mag<S, U[]> {
    if (arg === Mag.identity) {
      return this.castTo<U>()
    } else if (arg instanceof Mag) {
      return this.toGet(arg.get)
    } else if (typeof arg === 'function') {
      const other = arg(this)
      if (Array.isArray(other)) {
        return this.to(other)
      } else {
        return this.to(other)
      }
    } else {
      return this.to(Mag.of(arg))
    }
  }

  castTo<U>(): Mag<S, U> {
    return (this as unknown) as Mag<S, U>
  }

  cast<S, T>(): Mag<S, T> {
    return this.castOf<S>().castTo<T>()
  }

  view<U>(fn: (other: T) => U): Mag<S, U> {
    return this.toGet(s => [fn(s), () => s])
  }

  const<U>(other: U): Mag<S, U> {
    return this.view(() => other)
  }

  at<K extends keyof T>(key: K): Mag<S, T[K]> {
    return this.toGet(t => [t[key], u => ({ ...t, [key]: u })])
  }

  rev(fn: (other: T) => T): Mag<S, T> {
    return this.toGet(s => [fn(s), t => fn(t)])
  }

  update(fn: (other: T) => T): Mag<S, boolean> {
    return Mag.of(s => {
      const [t, p] = this.get(s)
      return [false, u => (u ? p(fn(t)) : s)]
    })
  }

  set(other: T): Mag<S, boolean> {
    return this.update(() => other)
  }

  map<U>(this: Mag<S, ItemType<T>[]>, other: Mag<ItemType<T>, U>): Mag<S, U[]> {
    return this.toGet(ts => {
      const [us, ps] = Mag.unpair(ts.map(other.get))
      return [us, us2 => ps.slice(0, us2.length).map((p, i) => p(us2[i]))]
    })
  }

  mapEntries<U>(
    this: Mag<S, ItemType<T>[]>,
    other: Mag<{ index: number; value: ItemType<T> }, U>,
  ): Mag<S, U[]> {
    return this.toGet(ts => {
      const [us, ps] = Mag.unpair(
        ts.map((t, i) => other.get({ index: i, value: t })),
      )
      // FIXME ignores result index
      return [us, us2 => ps.slice(0, us2.length).map((p, i) => p(us2[i]).value)]
    })
  }

  sequence<U>(others: [Mag<T, U>, ...Mag<T, U>[]]): Mag<S, U>
  sequence<U>(fn: (self: Mag<S, T>) => [Mag<T, U>, ...Mag<T, U>[]]): Mag<S, U>
  sequence<U>(
    arg:
      | ((self: Mag<S, T>) => [Mag<T, U>, ...Mag<T, U>[]])
      | [Mag<T, U>, ...Mag<T, U>[]],
  ) {
    if (typeof arg === 'function') {
      return this.sequence(arg(this))
    } else {
      return this.to(arg.reduce((a, b) => a.and(b)))
    }
  }

  and(other: Mag<S, T>): Mag<S, T> {
    return Mag.of(s => {
      const [r1, p1] = this.get(s)
      return [
        r1,
        t => {
          const [r2, p2] = other.get(p1(t))
          return p2(r2)
        },
      ]
    })
  }

  async run<U>(
    fn: (current: T, dest: U) => Promise<T>,
    source: S,
    dest: () => U,
  ): Promise<void> {
    while (true) {
      const [current, put] = this.get(source)
      const next = await fn(current, dest())
      source = put(next)
    }
  }

  traceGet(name?: string): Mag<S, T> {
    const msg = name ? `get ${name}` : 'get'
    return this.toGet(s => [trace(msg, s), t => t])
  }

  tracePut(name?: string): Mag<S, T> {
    const msg = name ? `put ${name}` : 'put'
    return this.toGet(s => [s, t => trace(msg, t)])
  }

  trace(name?: string): Mag<S, T> {
    return this.traceGet(name).tracePut(name)
  }

  get traced() {
    return this.trace()
  }

  get tracedGet() {
    return this.traceGet()
  }

  get tracedPut() {
    return this.tracePut()
  }

  private static unArray<T>() {
    return Mag.id<T>().castOf<ItemType<T>[]>()
  }

  private static make<S>(source: S): MagMake<S> {
    const entries = Mag.keys(source).map(
      key => [key, Mag.id<S>().at(key)] as const,
    )
    const made = Object.fromEntries(entries)
    return Mag.assertKeyed(made)
  }

  private static assertKeyed<T>(keyed: { [K in PropertyKey]: T[keyof T] }): T {
    return (keyed as unknown) as T
  }

  private static unpair<T, U>(pairs: [T, U][]): [T[], U[]] {
    const fsts = pairs.map(x => x[0])
    const snds = pairs.map(x => x[1])
    return [fsts, snds]
  }

  private static keys<T>(value: T): (keyof T)[] {
    return Object.keys(value) as any
  }

  private static entries<T>(value: T): [keyof T, T[keyof T]][] {
    const result: any[] = []
    for (const key in value) {
      result.push([key, value[key]])
    }
    return result
  }

  private static mapValues<T, U>(
    value: T,
    fn: <K extends keyof T>(v: T[K], k: K) => U,
  ): { [K in keyof T]: U } {
    return Object.fromEntries(
      Mag.entries(value).map(([k, v]) => [k, fn(v, k)]),
    ) as any
  }
}

type MagGet<S, T> = (source: S) => [T, (other: T) => S]
type MagFrom<U, S> = Mag<U, S> | { [K in keyof S]: S[K] | Mag<U, S[K]> }
type MagMake<T> = { [K in keyof T]: Mag<T, T[K]> }

type ItemType<T> = T extends unknown[] ? T[number] : never
type Match<T, K extends keyof any> = Extract<T, { [_ in K]: unknown }>[K]

function match<T>(
  value: T,
): <K extends keyof any, U>(key: K, fn: (x: Match<T, K>) => U) => U | undefined
function match<T>(
  value: T,
): <K extends keyof any, U>(key: K, fn: (x: Match<T, K>) => U, x: U) => U
function match<T, U, K extends keyof any>(
  value: T,
): (key: K, fn: (x: Match<T, K>) => U, x?: U) => U | undefined {
  return (key, fn, x) => {
    if (typeof value === 'object' && value !== null && key in value) {
      return fn((value as any)[key])
    } else {
      return x
    }
  }
}

function trace<T>(value: T): T
function trace<T>(message: any, value: T): T
function trace<T>(...args: [T] | [any, T]): T {
  console.log(...args)
  return args[args.length - 1]
}

export type VNode =
  | { div: VNode[] }
  | { text: string }
  | { button: { label: string; clicked: boolean } }
  | { input: string }
  | { numberinput: number }
  | { checkbox: boolean }
  | { hr: null }
  | { br: null }
  | { pre: string }
  | { loader: () => Promise<VNode> }

export function mount(source: VNode, dest: ChildNode): Promise<VNode> {
  const m = match(source)
  return new Promise(resolve => {
    m('div', async children => {
      const size = children.length
      const el =
        dest instanceof HTMLDivElement ? dest : document.createElement('div')
      if (el !== dest) dest.replaceWith(el)
      while (el.childNodes.length > size) el.lastChild!.remove()
      while (el.childNodes.length < size)
        el.appendChild(document.createTextNode(''))

      const { child, index } = await Promise.race(
        children.map(async (child, index) => ({
          child: await mount(child, el.childNodes[index]),
          index,
        })),
      )
      resolve({ div: Object.assign([], children, { [index]: child }) })
    })
    m('text', content => {
      if (dest.nodeType !== Node.TEXT_NODE) {
        dest.replaceWith(content)
      } else {
        if (dest.textContent !== content) dest.textContent = content
      }
    })
    m('button', button => {
      const el =
        dest instanceof HTMLButtonElement
          ? dest
          : document.createElement('button')
      if (el !== dest) {
        dest.replaceWith(el)
      }
      el.textContent = button.label
      el.onclick = () => resolve({ button: { ...button, clicked: true } })
    })
    m('input', value => {
      const el =
        dest instanceof HTMLInputElement && dest.type === 'text'
          ? dest
          : document.createElement('input')
      if (el !== dest) {
        dest.replaceWith(el)
        el.type = 'text'
      }
      el.value = value
      el.oninput = () => resolve({ input: el.value })
    })
    m('numberinput', value => {
      const el =
        dest instanceof HTMLInputElement && dest.type === 'number'
          ? dest
          : document.createElement('input')
      if (el !== dest) {
        dest.replaceWith(el)
        el.type = 'number'
      }
      el.valueAsNumber = value
      el.oninput = () => resolve({ numberinput: el.valueAsNumber || 0 })
    })
    m('checkbox', value => {
      const el =
        dest instanceof HTMLInputElement && dest.type === 'checkbox'
          ? dest
          : document.createElement('input')
      if (el !== dest) {
        dest.replaceWith(el)
        el.type = 'checkbox'
      }
      el.checked = value
      el.oninput = () => resolve({ checkbox: el.checked })
    })
    m('pre', content => {
      const el =
        dest instanceof HTMLPreElement ? dest : document.createElement('pre')
      if (el !== dest) dest.replaceWith(el)
      if (el.textContent !== content) el.textContent = content
    })
    m('hr', () => {
      if (!(dest instanceof HTMLHRElement))
        dest.replaceWith(document.createElement('hr'))
    })
    m('br', () => {
      if (!(dest instanceof HTMLBRElement))
        dest.replaceWith(document.createElement('br'))
    })
    m('loader', fn => fn().then(resolve))
  })
}

export type OfType<T extends Mag<any, any>> = T extends Mag<infer U, any>
  ? U
  : never
export type ToType<T extends Mag<any, any>> = T extends Mag<any, infer U>
  ? U
  : never

export const VNode = Mag.id<VNode>()
export const DomNode = Mag.id<ChildNode>()

export const Div = VNode.extract('div')
export const Text = VNode.extract('text')
export const Input = VNode.extract('input')
export const NumberInput = VNode.extract('numberinput')
export const Checkbox = VNode.extract('checkbox')
export const Button = VNode.extract('button').replace(s => [
  { ...s, clicked: false },
  ({ clicked: t }) => (t ? { ...s, clicked: t } : s),
])
export const Divider = VNode.extract('hr').of<any>(null)
export const Break = VNode.extract('br').of<any>(null)
export const Inspector = VNode.extract('pre').ofView(s =>
  JSON.stringify(s, null, 2),
)

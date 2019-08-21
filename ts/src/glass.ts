export type Glass<S, T> = {
  get(source: S): T
  put(other: T, source: S): S

  of<U>(get: Get<U, S>, put: Put<U, S>): Glass<U, T>
  of<U>(other: Glass<U, S>): Glass<U, T>
  of<U>(other: Glass<U, ItemType<S>>[]): Glass<U, T>
  of<U>(fn: (other: From<U>) => Glass<U, ItemType<S>>[]): Glass<U, T>
  of<U>(fn: (other: From<U>) => Glass<U, S>): Glass<U, T>
  of<U>(other: { [K in keyof S]: S[K] | Glass<U, S[K]> }): Glass<U, T>

  to<U>(get: Get<T, U>, put: Put<T, U>): Glass<S, U>
  to<U>(other: Glass<T, U>): Glass<S, U>
  to<U>(fn: (self: Glass<S, T>) => Glass<T, U>): Glass<S, U>

  at<K extends keyof T>(key: K): Glass<S, T[K]>

  view<U>(fn: (other: T) => U): Glass<S, U>

  update(fn: (other: T) => T): Glass<S, boolean>
  set(other: T): Glass<S, boolean>

  map<U>(other: Glass<ItemType<T>, U>): Glass<S, U[]>
  map<U>(fn: (self: Glass<S, T>) => Glass<ItemType<T>, U>): Glass<S, U[]>
}

function Glass<S>(): Glass<S, S>
function Glass<S, T>(get: Get<S, T>, put: Put<S, T>): Glass<S, T>
function Glass<S, T>(glasses: Glass<S, T>[]): Glass<S, T[]>

function Glass<S, T>(
  ...args: [] | [Glass<S, T>[]] | [Get<S, T>, Put<S, T>]
): Glass<S, T> | Glass<S, T[]> {
  switch (args.length) {
    case 2:
      const [get, put] = args
      const self: Glass<S, T> = {
        get,
        put,
        of<U>(
          ...ofArgs:
            | [Get<U, S>, Put<U, S>]
            | [Glass<U, S>]
            | [Glass<U, ItemType<S>>[]]
            | [(other: From<U>) => Glass<U, ItemType<S>>[]]
            | [(other: From<U>) => Glass<U, S>]
            | [{ [K in keyof S]: S[K] | Glass<U, S[K]> }]
        ): Glass<U, T> {
          switch (ofArgs.length) {
            case 2:
              return self.of(Glass(...ofArgs))
            case 1:
              const [other] = ofArgs
              if (isGlass(other)) {
                return other.to(self)
              } else if (Array.isArray(other)) {
                return self.of(Glass(other).to(asItems()))
              } else if (
                other === null ||
                (typeof other !== 'object' && typeof other !== 'function')
              ) {
                return self.of(Glass<U>().view(() => other))
              } else if (typeof other === 'function') {
                const getGlass = (s: U) => {
                  const gr = other(makeFrom(s))
                  return Array.isArray(gr) ? Glass(gr).to(asItems()) : gr
                }
                return self.of<U>(
                  s => getGlass(s).get(s),
                  (os, s) => getGlass(s).put(os, s),
                )
              } else {
                return self.of<U>(
                  s =>
                    Object.fromEntries<any>(
                      mapEntries(other, g => (isGlass(g) ? g.get(s) : g)),
                    ),
                  (os, s) =>
                    flatMapEntries(other, (g, k) =>
                      isGlass(g) ? [[g, os[k]] as const] : [],
                    ).reduceRight((acc, [g, o]) => g.put(o, acc) as U, s),
                )
              }
          }
        },
        to<U>(
          ...toArgs:
            | [Get<T, U>, Put<T, U>]
            | [Glass<T, U>]
            | [(self: Glass<S, T>) => Glass<T, U>]
        ): Glass<S, U> {
          switch (toArgs.length) {
            case 2:
              const glass = Glass(...toArgs)
              return Glass(
                (s: S) => glass.get(self.get(s)),
                (o, s) => self.put(glass.put(o, self.get(s)), s),
              )
            case 1:
              const [other] = toArgs
              if (isGlass(other)) {
                return self.to(other.get, other.put)
              } else {
                return self.to(other(self))
              }
          }
        },
        at: key => self.to(s => s[key], (o, s) => ({ ...s, [key]: o })),
        view: fn => self.to(fn, (_, s) => s),
        update: fn => self.to(() => false, (o, s) => (o ? fn(s) : s)),
        set: other => self.update(() => other),
        map<U>(
          other:
            | Glass<ItemType<T>, U>
            | ((self: Glass<S, T>) => Glass<ItemType<T>, U>),
        ): Glass<S, U[]> {
          if (typeof other === 'object') {
            return self.to(
              ss => mapIfArray(ss, other.get),
              (us, ss) => mapIfArray(ss, (s, i) => other.put(us[i], s)),
            )
          } else {
            return self.map(other(self))
          }
        },
      }
      return self
    case 1:
      const [glasses] = args
      return Glass(
        s => glasses.map(g => g.get(s)),
        (os, si) => glasses.reduceRight((s, g, i) => g.put(os[i], s), si),
      )
    case 0:
      return Glass<S & T, S & T>(s => s, s => s)
  }
}

type Get<S, T> = Glass<S, T>['get']
type Put<S, T> = Glass<S, T>['put']

type ItemType<T> = T extends unknown[] ? T[number] : never
type From<S> = { [K in keyof S]: Glass<S, S[K]> }

function isGlass(value: unknown): value is Glass<unknown, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    'put' in value &&
    'of' in value &&
    'to' in value &&
    'at' in value &&
    'view' in value &&
    'update' in value &&
    'set' in value &&
    'map' in value
  )
}

function assertItems<T>(items: T): ItemType<T>[] {
  return (items as unknown) as ItemType<T>[]
}

function assertArray<T>(items: ItemType<T>[]): T {
  return (items as unknown) as T
}

function asItems<T>(): Glass<ItemType<T>[], T> {
  return Glass(s => assertArray(s), s => assertItems(s))
}

function mapIfArray<T>(
  items: T,
  fn: (value: ItemType<T>, index: number) => ItemType<T>,
): T
function mapIfArray<T, U>(
  items: T,
  fn: (value: ItemType<T>, index: number) => U,
): U[]
function mapIfArray<T>(
  items: T,
  fn: (value: ItemType<T>, index: number) => ItemType<T>,
): T {
  return assertArray(assertItems(items).map(fn))
}

function mapEntries<T, U>(
  object: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): [keyof T, U][] {
  return Object.entries(object).map(([k, v]: any) => [k, fn(v, k)])
}

function flatMapEntries<T, U>(
  object: T,
  fn: (value: T[keyof T], key: keyof T) => U[],
): U[] {
  return Object.entries(object).flatMap(([k, v]: any) => fn(v, k))
}

function mapValues<T, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): { [K in keyof T]: U } {
  return Object.fromEntries(mapEntries(obj, (v, k) => fn(v, k))) as any
}

function makeFrom<S>(source: S): From<S> {
  const result = (mapValues(source, (_, key) =>
    Glass<S>().at((key as unknown) as keyof S),
  ) as unknown) as From<S>
  return result
}

function trace<T>(value: T, message?: string): T {
  if (message) {
    console.log(message, value)
  } else {
    console.log(value)
  }
  return value
}

type VNode = {
  node: Node
  listening?: boolean
  onevent?: () => void
}

function run<T>(view: Glass<T, VNode>, state: T, root: Node): void {
  const vnode = view.get(state)
  if (vnode.listening) {
    Object.defineProperty(vnode, 'onevent', {
      enumerable: true,
      configurable: true,
      get: () => () => {
        const nextState = view.put(vnode, state)
        console.log(state, nextState)
        run(view, nextState, root)
      },
    })
  }
  if (root.childNodes.length === 1) {
    reconcile(vnode.node, root.firstChild!)
  } else {
    while (root.firstChild) root.removeChild(root.firstChild)
    root.appendChild(vnode.node)
  }
}

function reconcile(source: Node, dest: ChildNode): void {
  if (source === dest) return
  if (
    source.constructor === dest.constructor &&
    source instanceof HTMLInputElement &&
    dest instanceof HTMLInputElement &&
    source.type === dest.type
  ) {
    dest.value = source.value
  } else if (
    source.constructor === dest.constructor &&
    source instanceof HTMLDivElement &&
    dest instanceof HTMLDivElement &&
    source.childNodes.length === dest.childNodes.length
  ) {
    const nodePairs = []
    for (let i = 0; i < source.childNodes.length; i++) {
      nodePairs.push([source.childNodes[i], dest.childNodes[i]])
    }
    for (const [s, d] of nodePairs) {
      reconcile(s, d)
    }
  } else if (
    source instanceof HTMLButtonElement &&
    dest instanceof HTMLButtonElement &&
    source.childNodes.length === dest.childNodes.length
  ) {
    const nodePairs = []
    for (let i = 0; i < source.childNodes.length; i++) {
      nodePairs.push([source.childNodes[i], dest.childNodes[i]])
    }
    for (const [s, d] of nodePairs) {
      reconcile(s, d)
    }
  } else {
    dest.replaceWith(source.cloneNode(true))
  }
}

type ButtonConfig = { label: string; clicked: boolean }
const Button = Glass(
  ({ label }: ButtonConfig): VNode => {
    const node = document.createElement('button')
    node.append(label)
    const vnode: VNode = { node, listening: true }
    node.onclick = () => {
      node.value = 'clicked'
      vnode.onevent && vnode.onevent()
      node.removeAttribute('value')
    }
    return vnode
  },
  (o, s) => ({
    ...s,
    clicked: (o.node as HTMLButtonElement).value === 'clicked',
  }),
)
const Div = Glass(
  (children: VNode[]): VNode => {
    const node = document.createElement('div')
    node.append(...children.map(x => x.node))
    const listeners = children.filter(x => x.listening)
    if (listeners.length) {
      const vnode: VNode = { node, listening: true }
      for (const child of listeners) {
        Object.defineProperty(child, 'onevent', {
          enumerable: true,
          configurable: true,
          get: () => vnode.onevent,
        })
      }
      return vnode
    } else {
      return { node }
    }
  },
  o => [...o.node.childNodes].map(node => ({ node })),
)
const Input = Glass(
  (value: string): VNode => {
    const node = document.createElement('input')
    node.type = 'text'
    node.value = value
    const vnode: VNode = { node, listening: true }
    node.oninput = () => {
      vnode.onevent && vnode.onevent()
    }
    return vnode
  },
  vnode => (vnode.node as HTMLInputElement).value,
)
const NumberInput = Glass(
  (value: number): VNode => {
    const node = document.createElement('input')
    node.type = 'number'
    node.value = value.toString()
    const vnode: VNode = { node, listening: true }
    node.oninput = () => {
      vnode.onevent && vnode.onevent()
    }
    return vnode
  },
  (o, s) => {
    const res = (o.node as HTMLInputElement).valueAsNumber
    return res === null || isNaN(res) ? s : res
  },
)
const CheckBox = Glass(
  (checked: boolean): VNode => {
    const node = document.createElement('input')
    node.type = 'checkbox'
    node.checked = checked
    const vnode: VNode = { node, listening: true }
    node.oninput = () => {
      vnode.onevent && vnode.onevent()
    }
    return vnode
  },
  vnode => (vnode.node as HTMLInputElement).checked,
)
const Text = Glass<string>().view(
  (content): VNode => {
    const node = document.createElement('span')
    node.append(content)
    return { node }
  },
)
const Divider = Glass<any>().view(
  (): VNode => ({ node: document.createElement('hr') }),
)
const Break = Glass<any>().view(
  (): VNode => ({ node: document.createElement('br') }),
)
const Inspector = Glass<any>().view(
  (s): VNode => {
    const node = document.createElement('pre')
    node.append(JSON.stringify(s, null, 2))
    return { node }
  },
)

type Root = {
  name: string
  count: number
  changeBy: number
  todos: Todo[]
  url: string
}

type Todo = { content: string; done: boolean }

const initialState: Root = {
  name: 'world',
  count: 0,
  changeBy: 1,
  todos: [
    { content: 'buy milk', done: false },
    { content: 'buy eggs', done: true },
  ],
  url: 'https://example.com',
}

const App = Div.of<Root>(({ count, changeBy, name, todos }) => [
  Text.of('fowards: '),
  Input.of(name),
  Break,
  Text.of('backwards: '),
  Input.of(
    name.to(
      x =>
        x
          .split('')
          .reverse()
          .join(''),
      x =>
        x
          .split('')
          .reverse()
          .join(''),
    ),
  ),
  Break,
  Text.of(name.view(x => `Hello, ${x}`)),
  Break,
  Text.of(name.view(x => x.toUpperCase())),

  Divider,

  Button.of({ label: '-', clicked: count.update(x => trace(x, '-') - 1) }),
  Text.of(count.view(x => `${x}`)),
  Button.of({ label: '+', clicked: count.update(x => trace(x, '+') + 1) }),
  Break,
  Button.of({ label: 'reset', clicked: count.set(0) }),
  Break,
  Text.of('what to change count by'),
  Break,
  NumberInput.of(changeBy),

  Divider,

  Text.of(todos.view(x => `${x.filter(y => !y.done).length} todo`)),
  Break,
  Text.of(todos.view(x => `${x.filter(y => y.done).length} done`)),
  Break,
  todos
    .map(
      Div.of(({ content, done }) => [
        Input.of(content),
        CheckBox.of(done),
        Button.of({ label: 'remove (not working)', clicked: false }),
      ]),
    )
    .to(Div),
  Button.of({
    label: 'new todo',
    clicked: todos.update(xs => [...xs, { content: '', done: false }]),
  }),
  Button.of({ label: 'clear', clicked: todos.set([]) }),

  Divider,
  Inspector,
])

const root = document.getElementById('app')!
// run(App, initialState, root)
run(
  Div.of([
    Button.of({
      label: 'click me',
      clicked: Glass<number>().update(x => x + 1),
    }),
    Inspector,
  ]),
  3,
  root,
)

// module.hot && module.hot.accept()

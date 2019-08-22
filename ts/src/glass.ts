import 'babel-polyfill'

type Glass<S, T> = {
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

  update(fn: (value: T) => T): Glass<S, boolean>
  update<U>(
    other: Glass<S, U>,
    fn: (value: T, other: U) => T,
  ): Glass<S, boolean>
  set(other: T): Glass<S, boolean>

  map<U>(other: Glass<ItemType<T>, U>): Glass<S, U[]>
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
              const [get, put] = toArgs
              return Glass(
                (s: S) => get(self.get(s)),
                (o, s) => self.put(put(o, self.get(s)), s),
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
        update<U>(
          ...updateArgs:
            | [(value: T) => T]
            | [Glass<S, U>, (value: T, other: U) => T]
        ) {
          if (updateArgs.length === 1) {
            const [fn] = updateArgs
            return self.to(() => false, (o, s) => (o ? fn(s) : s))
          } else {
            const [other, fn] = updateArgs
            return Glass<S, boolean>(
              () => false,
              (o, s) => (o ? self.put(fn(self.get(s), other.get(s)), s) : s),
            )
          }
        },
        set: other => self.update(() => other),
        map: other =>
          self
            .to(asArray())
            .to(
              ss => ss.map(other.get),
              (us, ss) => ss.map((s, i) => other.put(us[i], s)),
            )
            .to(asItems()),
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

function asArray<T>(): Glass<T, ItemType<T>[]> {
  return Glass(s => assertItems(s), s => assertArray(s))
}

function asItems<T>(): Glass<ItemType<T>[], T> {
  return Glass(s => assertArray(s), s => assertItems(s))
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

function trace<T>(value: T): T
function trace<T>(message: any, value: T): T
function trace<T>(...args: [T] | [any, T]): T {
  console.log(...args)
  return args[args.length - 1]
}

type VNode =
  | { tag: 'div'; children: VNode[] }
  | { tag: 'text'; text: string }
  | { tag: 'button'; label: string; clicked: boolean }
  | { tag: 'input'; text: string }
  | { tag: 'numberinput'; value: number }
  | { tag: 'checkbox'; checked: boolean }
  | { tag: 'divider' }
  | { tag: 'break' }
  | { tag: 'pre'; text: string }

async function run<T>(
  view: Glass<T, VNode>,
  state: T,
  root: ChildNode,
): Promise<void> {
  while (root.childNodes.length > 1) root.lastChild!.remove()
  const dest = root.firstChild || document.createElement('div')
  if (root.firstChild !== dest) root.appendChild(dest)

  do {
    const node = view.get(state)
    const nextNode = await reconcile(node, dest)
    state = view.put(nextNode, state)
  } while (true)
}

function reconcile(source: VNode, dest: ChildNode): Promise<VNode> {
  return new Promise(async resolve => {
    if (source.tag === 'div') {
      const size = source.children.length
      const el =
        dest instanceof HTMLDivElement ? dest : document.createElement('div')
      if (el !== dest) dest.replaceWith(el)
      while (el.childNodes.length > size) el.lastChild!.remove()
      while (el.childNodes.length < size)
        el.appendChild(document.createElement('div'))

      const { child, index } = await Promise.race(
        source.children.map(async (child, index) => ({
          child: await reconcile(child, el.childNodes[index]),
          index,
        })),
      )
      resolve({
        ...source,
        children: Object.assign([], source.children, { [index]: child }),
      })
    } else if (source.tag === 'text') {
      if (dest.nodeType !== Node.TEXT_NODE) {
        dest.replaceWith(source.text)
      } else {
        if (dest.textContent !== source.text) dest.textContent = source.text
      }
    } else if (source.tag === 'button') {
      const el =
        dest instanceof HTMLButtonElement
          ? dest
          : document.createElement('button')
      if (el !== dest) {
        dest.replaceWith(el)
      }
      el.textContent = source.label
      el.onclick = () => resolve({ ...source, clicked: true })
    } else if (source.tag === 'input') {
      const el =
        dest instanceof HTMLInputElement && dest.type === 'text'
          ? dest
          : document.createElement('input')
      if (el !== dest) {
        dest.replaceWith(el)
        el.type = 'text'
      }
      el.value = source.text
      el.oninput = () => resolve({ ...source, text: el.value })
    } else if (source.tag === 'numberinput') {
      const el =
        dest instanceof HTMLInputElement && dest.type === 'number'
          ? dest
          : document.createElement('input')
      if (el !== dest) {
        dest.replaceWith(el)
        el.type = 'number'
      }
      el.valueAsNumber = source.value
      el.oninput = () => resolve({ ...source, value: el.valueAsNumber || 0 })
    } else if (source.tag === 'checkbox') {
      const el =
        dest instanceof HTMLInputElement && dest.type === 'checkbox'
          ? dest
          : document.createElement('input')
      if (el !== dest) {
        dest.replaceWith(el)
        el.type = 'checkbox'
      }
      el.checked = source.checked
      el.oninput = () => resolve({ ...source, checked: el.checked })
    } else if (source.tag === 'pre') {
      const el =
        dest instanceof HTMLPreElement ? dest : document.createElement('pre')
      if (el !== dest) dest.replaceWith(el)
      if (el.textContent !== source.text) el.textContent = source.text
    } else if (source.tag === 'divider') {
      if (!(dest instanceof HTMLHRElement))
        dest.replaceWith(document.createElement('hr'))
    } else if (source.tag === 'break') {
      if (!(dest instanceof HTMLBRElement))
        dest.replaceWith(document.createElement('br'))
    }
  })
}

const Div = Glass<VNode[], VNode>(
  children => ({ tag: 'div', children }),
  o => (o.tag === 'div' ? o.children : []),
)
const Text = Glass<string>().view<VNode>(text => ({ tag: 'text', text }))
const Button = Glass<{ label: string; clicked: boolean }, VNode>(
  s => ({ tag: 'button', ...s, clicked: false }),
  (o, s) => ({ ...s, clicked: o.tag === 'button' ? o.clicked : false }),
)
const Input = Glass<string, VNode>(
  text => ({ tag: 'input', text }),
  o => (o.tag === 'input' ? o.text : ''),
)
const NumberInput = Glass<number, VNode>(
  value => ({ tag: 'numberinput', value }),
  o => (o.tag === 'numberinput' ? o.value : 0),
)
const CheckBox = Glass<boolean, VNode>(
  checked => ({ tag: 'checkbox', checked }),
  o => (o.tag === 'checkbox' ? o.checked : false),
)
const Divider = Glass<any>().view<VNode>(() => ({ tag: 'divider' }))
const Break = Glass<any>().view<VNode>(() => ({ tag: 'break' }))
const Inspector = Glass<any>().view<VNode>(
  (s): VNode => ({ tag: 'pre', text: JSON.stringify(s, null, 2) }),
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

  Button.of({
    label: '-',
    clicked: count.update(changeBy, (x, a) => x - a),
  }),
  Text.of(count.view(x => `${x}`)),
  Button.of({
    label: '+',
    clicked: count.update(changeBy, (x, a) => x + a),
  }),
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
run(App, initialState, root)

// module.hot && module.hot.accept()

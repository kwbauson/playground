export type Glass<S, T> = {
  get(source: S): T
  put(source: S, other: T): S

  of<U>(get: Get<U, S>, put: Put<U, S>): Glass<U, T>
  of<U>(other: Glass<U, S>): Glass<U, T>
  of<U>(other: Glass<U, ItemType<S>>[]): Glass<U, T>
  of<U = never>(other: S): Glass<U, T>
  of<U>(other: { [K in keyof S]: Some<S[K] | Glass<U, S[K]>> }): Glass<U, T>

  from<U>(fn: (other: From<U>) => Glass<U, S>): Glass<U, T>
  from<U>(fn: (other: From<U>) => Glass<U, ItemType<S>>[]): Glass<U, T>

  to<U>(get: Get<T, U>, put: Put<T, U>): Glass<S, U>
  to<U>(other: Glass<T, U>): Glass<S, U>
  to<U>(fn: (self: Glass<S, T>) => Glass<T, U>): Glass<S, U>
  to<U>(other: Glass<T, U>[]): Glass<S, U[]>
  to<U>(fn: (self: Glass<S, T>) => Glass<T, U>[]): Glass<S, U[]>

  for<U extends For<S, U>>(
    fn: (self: Glass<S, T>) => U,
  ): Glass<S, ForType<S, U>>
  for<U extends For<S, U>>(other: U): Glass<S, ForType<S, U>>

  view<U>(fn: (other: T) => U): Glass<S, U>

  update(fn: (other: T) => T): Glass<S, boolean>
  set(other: T): Glass<S, boolean>

  prop<K extends keyof T>(key: K): Glass<S, T[K]>
  map<U>(other: Glass<ItemType<T>, U>): Glass<S, U[]>
  map<U>(fn: (self: Glass<S, T>) => Glass<ItemType<T>, U>): Glass<S, U[]>
}

type Get<S, T> = Glass<S, T>['get']
type Put<S, T> = Glass<S, T>['put']

type ItemType<T> = T extends unknown[] ? T[number] : never
type Some<T> = T | T[]
type For<S, T> = { [K in keyof T]: Glass<S, T[K]> | T[K] }
type ForType<S, T> = {
  [K in keyof T]: T[K] extends Glass<S, infer U> ? U : T[K]
}
type From<S> = { [K in keyof S]: Glass<S, S[K]> }

function isGlass(value: unknown): value is Glass<unknown, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    'put' in value &&
    'of' in value &&
    'from' in value &&
    'to' in value &&
    'view' in value &&
    'update' in value &&
    'set' in value &&
    'prop' in value &&
    'map' in value
  )
}

function assertItems<T>(items: T): ItemType<T>[] {
  return (items as unknown) as ItemType<T>[]
}

function assertArray<T>(items: ItemType<T>[]): T {
  return (items as unknown) as T
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

function makeFrom<T>(source: T): From<T> {
  return (Object.fromEntries(
    Object.keys(source).map(key => [
      key,
      Glass<T>().prop((key as unknown) as keyof T),
    ]),
  ) as unknown) as From<T>
}

function Glass<S>(): Glass<S, S>
function Glass<S, T>(get: Get<S, T>, put: Put<S, T>): Glass<S, T>
function Glass<S, T>(config: (source: S) => [T, (other: T) => S]): Glass<S, T>
function Glass<S, T>(glasses: Glass<S, T>[]): Glass<S, T[]>

function Glass<S, T>(
  ...args:
    | []
    | [(source: S) => [T, (other: T) => S]]
    | [Glass<S, T>[]]
    | [Get<S, T>, Put<S, T>]
): Glass<S, T | T[]> {
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
            | [S]
            | [{ [K in keyof S]: Some<S[K] | Glass<U, S[K]>> }]
        ) {
          switch (ofArgs.length) {
            case 2:
              return Glass(...ofArgs)
            case 1:
              const [other] = ofArgs
              if (isGlass(other)) {
                return other.to(self)
              } else if (Array.isArray(other)) {
                return Glass(other)
                  .to(s => assertArray(s), s => s)
                  .to(self)
              } else {
                return Glass<any>()
              }
          }
        },
        from<U>(
          fn:
            | ((other: From<U>) => Glass<U, S>)
            | ((other: From<U>) => Glass<U, ItemType<S>>[]),
        ) {
          return self.of<U>(
            s => {
              const gr = fn(makeFrom(s))
              return Array.isArray(gr)
                ? assertArray(gr.map(g => g.get(s)))
                : gr.get(s)
            },
            (s, os) => {
              const gr = fn(makeFrom(s))
              return Array.isArray(gr)
                ? gr.reduce((acc, g, i) => g.put(acc, assertItems(os)[i]), s)
                : gr.put(s, os)
            },
          )
        },
        to<U>(
          ...toArgs:
            | [Get<T, U>, Put<T, U>]
            | [Glass<T, U>]
            | [(self: Glass<S, T>) => Glass<T, U>]
            | [Glass<T, U>[]]
            | [(self: Glass<S, T>) => Glass<T, U>[]]
        ) {
          switch (toArgs.length) {
            case 2:
              return Glass(...toArgs).of(self)
            case 1:
              const [other] = toArgs
              if (isGlass(other)) {
                return self.to(s => other.get(s), (s, u) => other.put(s, u))
              } else if (Array.isArray(other)) {
                return self.to(Glass(other))
              } else {
                const gr = other(self)
                return Array.isArray(gr) ? self.to(gr) : self.to(gr)
              }
          }
        },
        for: () => Glass<any>(),
        view: fn => self.to(fn, s => s),
        update: fn => self.to(() => false, (s, o) => (o ? fn(s) : s)),
        set: other => self.update(() => other),
        prop: key => self.to(s => s[key], (s, o) => ({ ...s, [key]: o })),
        map<U>(
          other:
            | Glass<ItemType<T>, U>
            | ((self: Glass<S, T>) => Glass<ItemType<T>, U>),
        ) {
          if (typeof other === 'object') {
            return self.to(
              ss => mapIfArray(ss, other.get),
              (ss, us) => mapIfArray(ss, (s, i) => other.put(s, us[i])),
            )
          } else {
            return self.map(other(self))
          }
        },
      }
      return self
    case 1:
      if (Array.isArray(args[0])) {
        const [glasses] = args
        return Glass<S, T[]>(
          s => glasses.map(g => g.get(s)),
          (si, os) => glasses.reduce((s, g, i) => g.put(s, os[i]), si),
        )
      } else {
        const [config] = args
        return Glass<S, T>(s => config(s)[0], (s, o) => config(s)[1](o))
      }
    case 0:
      const id = (s: S & T) => s
      return Glass(id, id)
  }
}

type ButtonConfig = { label: string; clicked: boolean }
const Button = Glass<ButtonConfig>().view(({ label }) => {
  const node = document.createElement('button')
  node.append(label)
  return node
})

const Div = Glass<Node[]>().view(
  (children): Node => {
    const node = document.createElement('div')
    node.append(...children)
    return node
  },
)
const Fragment = Glass<Node[]>().view(
  (children): Node => {
    const node = document.createDocumentFragment()
    node.append(...children)
    return node
  },
)
const Input = Glass<string>().view(
  (value): Node => {
    const node = document.createElement('input')
    node.type = 'text'
    node.value = value
    return node
  },
)
const NumberInput = Glass<number>().view(
  (value): Node => {
    const node = document.createElement('input')
    node.type = 'number'
    node.value = value.toString()
    return node
  },
)
const CheckBox = Glass<boolean>().view(
  (checked): Node => {
    const node = document.createElement('input')
    node.type = 'checkbox'
    node.checked = checked
    return node
  },
)
const Text = Glass<string | number>().view(
  (content): Node => document.createTextNode(content.toString()),
)
const Divider = Glass<never>().view((): Node => document.createElement('hr'))

function run<T>(view: Glass<T, Node>, state: T, root: Node): void {
  const node = view.get(state)
  while (root.firstChild) root.removeChild(root.firstChild)
  root.appendChild(node)
}

type Root = {
  count: number
  changeBy: number
  name: string
  todos: Todo[]
  url: string
}

type Todo = { content: string; done: boolean }

const initialState: Root = {
  count: 0,
  changeBy: 1,
  name: '',
  todos: [],
  url: 'https://example.com',
}

const App = Div.from<Root>(({ count, changeBy, name, todos }) => [
  Button.of({ label: '-', clicked: count.update(x => x - 1) }),
  Text.of(count),
  Button.of({ label: '+', clicked: count.update(x => x + 1) }),
  Button.of({ label: 'reset', clicked: [count.set(0), changeBy.set(1)] }),
  Text.of('what to change count by'),
  NumberInput.of(changeBy),

  Divider,

  Text.of('type your name'),
  Input.of(name),
  Text.of(name.view(x => `Hello, ${x}`)),

  Divider,

  todos
    .map(
      Div.from(({ content, done }) => [
        Input.of(content),
        CheckBox.of(done),
        Button.of({ label: 'remove (unimplimented)', clicked: false }),
      ]),
    )
    .to(Fragment),
  Button.of({
    label: 'new todo',
    clicked: todos.update(xs => [...xs, { content: '', done: false }]),
  }),
  Button.of({ label: 'clear', clicked: todos.set([]) }),
])

console.log(App)

run(App, initialState, document.getElementById('app')!)

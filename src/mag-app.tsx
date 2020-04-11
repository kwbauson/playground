import {
  Mag,
  Break,
  Button,
  Checkbox,
  Div,
  Divider,
  Input,
  Inspector,
  NumberInput,
  Text,
  VNode,
} from './mag'

type Root = {
  name: string
  count: number
  changeBy: number
  todos: Todo[]
  url: string
}

type Todo = { content: string; done: boolean }

export const initialState: Root = {
  name: 'hello world',
  count: 0,
  changeBy: 1,
  todos: [
    { content: 'buy milk', done: false },
    { content: 'buy eggs', done: true },
  ],
  url: 'https://example.com',
}
const Async = VNode.extract('loader')
const Fetch = Mag.id<string>().view(url => () =>
  fetch(url).then(r => r.json() as Promise<Todo>),
)

// FIXME this should be an error
const foo = Async.of(Fetch)

export const App = Div.of<Root>(({ count, changeBy, name, todos, url }) => [
  Text.of<Root>('fowards: '),
  Input.of(name),
  Break,
  Text.of('backward: '),
  Input.of(
    name.rev(s =>
      s
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
    clicked: count.update(x => x - 1),
    // clicked: count.update(changeBy, (x, a) => x - a),
  }),
  Text.of(count.view(x => `${x}`)),
  Button.of({
    label: '+',
    clicked: count.update(x => x + 1),
    // clicked: count.update(changeBy, (x, a) => x + a),
  }),
  Break,
  Button.of({ label: 'reset', clicked: count.set(0) }),
  Break,
  Text.of('what to count by'),
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
        Checkbox.of(done),
        Button.of<Todo>({ label: 'remove', clicked: false }),
      ]),
    )
    .to(Div),
  Button.of({
    label: 'new todo',
    clicked: todos.update(xs => [...xs, { content: '', done: false }]),
  }),
  Button.of({ label: 'clear', clicked: todos.set([]) }),

  Divider,

  Text.of(url),
  Break,
  Button.of({ label: 'load url', clicked: false }),

  Divider,
  Inspector,
])

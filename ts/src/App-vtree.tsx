import React from 'react'
import { View, keys, is } from './vtree'
import * as t from 'io-ts'
import _ from 'lodash'

class Entry<T, R = any> {
  constructor(public key: string | number, public value: View<T, R>) {}
}

const jsonView = View.create()
  .match(t.union([t.string, t.number, t.boolean, t.null]), ({ value }) => (
    <code>{JSON.stringify(value)}</code>
  ))
  .match(
    x => Array.isArray(x) || _.isPlainObject(x),
    ({ children, render }) => {
      const isArray = Array.isArray(children)
      const entries = Object.entries(children)
      const opening = isArray ? '[' : '{'
      const closing = isArray ? ']' : '}'
      return (
        <>
          <code>{opening}</code>
          {entries.map(([key, val], i) => (
            <div key={key} style={{ paddingLeft: 16 }}>
              {render(new Entry(isArray ? i : key, val))}
              {i !== entries.length - 1 && <code>,</code>}
            </div>
          ))}
          <code>{closing}</code>
        </>
      )
    },
  )
  .match(is(Entry), ({ children: { key, value } }) => (
    <>
      <code>{JSON.stringify(key.value)}:&nbsp;</code>
      {value.render()}
    </>
  ))

function isUrl(value: any): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('http://') || value.startsWith('https://'))
  )
}

function isImageUrl(value: any): value is string {
  return isUrl(value) && !!value.match(/\.(jpe?g|gif|png)$/i)
}

export const App = View.create()
  .match(t.any, <i>UNHANDLED</i>)
  .include(jsonView)
  .match(isUrl, ({ value: url, set }) => (
    <a
      href={url}
      onClick={e => {
        e.preventDefault()
        set({ load: url })
      }}
      children={url}
    />
  ))
  .match(isImageUrl, ({ value }) => (
    <img src={value} style={{ maxWidth: 500 }} />
  ))
  .match({ load: isUrl }, async ({ value: { load: url }, set }) => {
    set(`loading ${url}`)
    const response = await fetch(url)
    const json = await response.json()
    set({ loaded: json, url })
  })
  .match({ loaded: t.any, url: isUrl }, ({ value: { url }, set, children }) => (
    <>
      <button onClick={() => set({ load: url })}>reload</button>
      <button onClick={() => set(url)}>unload</button>
      {children.loaded.render()}
    </>
  ))
  .matchKey('click_to_change_root', ({ root }) => (
    <button onClick={() => root.children.random_number.set(Math.random())}>
      random
    </button>
  ))
  .match({ count: t.number }, ({ children: { count } }) => (
    <>
      <button onClick={() => count.set(x => x - 1)}>-</button>
      {count.value}
      <button onClick={() => count.set(x => x + 1)}>+</button>
    </>
  ))
  .matchKey('text_box', ({ value, set }) => (
    <input value={value} onChange={e => set(e.target.value)} />
  ))
  .matchKey('random_number', ({ value, set }) => (
    <input type="number" value={value} onChange={e => set(e.target.value)} />
  ))
  .match(
    keys('dragging', 'width', 'height', 'x', 'y', 'xOff', 'yOff', 'clicked'),
    ({ children: { dragging, width, height, x, y, xOff, yOff, clicked } }) => (
      <div
        style={{
          width: width.value,
          height: height.value,
          background: 'blue',
          border: '1px solid black',
          ...(clicked.value
            ? {
                position: 'absolute',
                left: x.value,
                top: y.value,
              }
            : {}),
        }}
        onMouseDown={e => {
          if (!clicked.value) {
            clicked.set(true)
            x.set(e.pageX - width.value / 2)
            y.set(e.pageY - height.value / 2)
          }
          e.preventDefault()
          xOff.set(e.pageX - x.value)
          yOff.set(e.pageY - y.value)
          dragging.set(true)
        }}
        onMouseMove={e => {
          if (dragging.value) {
            x.set(e.pageX - xOff.value)
            y.set(e.pageY - yOff.value)
          }
        }}
        onMouseUp={() => {
          dragging.set(false)
        }}
      />
    ),
  )
  .match<Entry<Todo[]>>(
    x => is(Entry)(x) && x.key === 'todoMvc',
    ({ value: entry }) => entry.value,
  )
  .match<TodoMVC>(
    keys('newTodo', 'todos', 'viewing'),
    ({ children: { newTodo, todos, viewing } }) => (
      <div>
        <div>todos</div>
        <div>
          <input
            value={newTodo.value}
            onChange={e => newTodo.set(e.target.value)}
            placeholder="What needs to be done?"
          />
          <button
            onClick={() => {
              todos.set(xs => [
                ...xs,
                { text: newTodo.value, completed: false },
              ])
            }}
          >
            add
          </button>
        </div>
        {todos.children
          .filter(
            x =>
              viewing.value === 'all' ||
              (viewing.value == 'active' && !x.value.completed) ||
              (viewing.value === 'completed' && x.value.completed),
          )
          .map(x => (
            <Todo key={x.key} view={x} />
          ))}
        <div style={{ justifyContent: 'space-between' }}>
          <span>{todos.value.filter(x => !x.completed).length} items left</span>
          <span>
            <button onClick={() => viewing.set('all')}>all</button>
            <button onClick={() => viewing.set('active')}>active</button>
            <button onClick={() => viewing.set('completed')}>completed</button>
          </span>
          <button
            onClick={() => todos.set(todos.value.filter(x => !x.completed))}
          >
            clear completed
          </button>
        </div>
      </div>
    ),
  )
  .match({ text: t.string, completed: t.boolean }, ({ children }) => (
    <div>
      <input type="check" />
    </div>
  ))
  .component(require('./initial-state'))

const Todo: React.FunctionComponent<{ view: View<Todo> }> = ({
  view: {
    children: { text, completed },
  },
}) => (
  <div>
    <button onClick={() => completed.set(x => !x)}>
      {completed.value ? 'uncomplete' : 'complete'}
    </button>
    <span>{text.value}</span>
  </div>
)

type TodoMVC = {
  newTodo: string
  todos: Todo[]
  viewing: 'all' | 'active' | 'completed'
}

type Todo = {
  text: string
  completed: boolean
}

Object.assign(window, { rootView: App.view })

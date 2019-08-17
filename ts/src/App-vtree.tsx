import React from 'react'
import { View, keys, is } from './vtree'
import * as t from 'io-ts'
import _ from 'lodash'
import util from 'util'
import * as babelModule from '@babel/core'

export const babel = babelModule

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

const appView = View.create()
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

const HoleName = Symbol('HoleName')
const HoleGot = Symbol('HoleGot')

export class Hole extends Function {
  static create<T = any>(name: string): T & Hole {
    return new Proxy(new Hole(name) as any, {
      get: (target, prop) => {
        if (
          prop === Symbol.toPrimitive ||
          prop === HoleName ||
          prop === HoleGot
        ) {
          return target[prop]
        } else {
          const append =
            typeof prop === 'string'
              ? name !== ''
                ? '.' + prop
                : prop
              : '[' + String(prop) + ']'
          return Hole.create(name + append)
        }
      },
      apply: (target, thisArg, args: any[]) =>
        Hole.create(
          name + '(' + args.map(x => util.inspect(x)).join(', ') + ')',
        ),
    })
  }

  [HoleName]: string;
  [HoleGot]: object = {}

  private constructor(name: string) {
    super()
    this[HoleName] = name
  }

  [Symbol.toPrimitive](hint: 'number' | 'string' | 'default') {
    return this[HoleName]
  }
}

const originalCreateElement = React.createElement

function previewCreateElement(
  this: any,
  type: any,
  config: any,
  children: any,
): React.ReactElement<any> {
  if (arguments.length > 2) {
    let i = 0
    for (const arg of arguments) {
      if (i > 2 && arg instanceof Hole) {
        arguments[i] = (
          <i>
            <b>{arg[HoleName]}</b>
          </i>
        )
      }
      i++
    }
  }
  return originalCreateElement.apply(this, arguments as any)
}

React.createElement = previewCreateElement as any

function preview<T>(component: React.ComponentType<T>): JSX.Element {
  const props = Hole.create('props')
  const element = React.createElement(component)
  return Object.assign({}, element, { props })
}

const Demo = (props: any) => {
  const { text } = props
  return (
    <div>
      <div>original: {text}</div>
      <div>upper case: {text.toUpperCase()}</div>
      <div>lower case: {text.toLowerCase()}</div>
      <input value={text} onChange={e => props.onChange(e.target.value)} />
      <div>
        reversed:{' '}
        {text
          .split('')
          .reverse()
          .join('')}
      </div>
    </div>
  )
}

export const App = () => (
  <>
    {preview(Demo)}
    {/* <Demo text="foo BAR" /> */}
  </>
)

// export const App = appView.component(require('./initial-state'))

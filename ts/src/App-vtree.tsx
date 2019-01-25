import React from 'react'
import { View, keys } from './vtree'
import * as t from 'io-ts'
import _ from 'lodash'

function isUrl(value: any): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('http://') || value.startsWith('https://'))
  )
}

function isImageUrl(value: any): value is string {
  return isUrl(value) && !!value.match(/\.(jpe?g|gif|png)$/i)
}

const jsonView = View.create()
  .match(t.union([t.string, t.number, t.boolean, t.null]), ({ value }) => (
    <code>{JSON.stringify(value)}</code>
  ))
  .match(
    x => Array.isArray(x) || _.isPlainObject(x),
    ({ value, children }) => {
      const isArray = Array.isArray(value)
      const entries = Object.entries(children)
      const opening = isArray ? '[' : '{'
      const closing = isArray ? ']' : '}'
      return (
        <>
          <code>{opening}</code>
          {entries.map(([key, val], i) => (
            <div key={key} style={{ paddingLeft: 16 }}>
              <code>{isArray ? i : JSON.stringify(key)}:&nbsp;</code>
              {val.render()}
              {i !== entries.length - 1 && <code>,</code>}
            </div>
          ))}
          <code>{closing}</code>
        </>
      )
    },
  )

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
  .component(require('./initial-state'))

Object.assign(window, { rootView: App.view })

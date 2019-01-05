import React from 'react'
import { observable, toJS, autorun } from 'mobx'
import { observer } from 'mobx-react'
import axios from 'axios'
import {
  Drawer,
  List,
  ListItem,
  DrawerHeader,
  DrawerTitle,
  DrawerContent,
  Toolbar,
  ToolbarRow,
  ToolbarTitle,
  IconButton,
  Typography,
} from 'rmwc'
import 'material-components-web/dist/material-components-web.min.css'
import { CircularProgress } from '@rmwc/circular-progress'
import '@rmwc/circular-progress/circular-progress.css'
import _ from 'lodash'

type View<T> = ViewFunc<T> | ViewNode

type ViewChild = {
  set: (x: any) => void
  render: () => ViewNode
}

type ViewNode =
  | JSX.Element
  | string
  | { [index: number]: ViewNode }
  | Promise<any>
  | false
  | null
  | undefined

type ViewFunc<T> = (
  x: T,
  props: {
    set: (x: any) => void
    children: { [K in keyof T]: ViewChild }
  },
) => ViewNode | void

type Matcher<T> =
  | ((x: any) => x is T)
  | ((x: any) => boolean)
  | string
  | boolean
  | number
  | null
  | { [key: string]: Matcher<any> }
  | string[]

function match<T>(matcher: Matcher<T>): (x: any) => x is T {
  function predicate(x: any): x is T {
    if (typeof matcher === 'function') {
      return matcher(x)
    } else if (Array.isArray(matcher)) {
      const keys = typeof x === 'object' && x !== null ? Object.keys(x) : []
      return matcher.every(k => keys.includes(k))
    } else if (
      typeof matcher === 'object' &&
      matcher !== null &&
      typeof x === 'object' &&
      x !== null
    ) {
      return Object.entries(matcher).every(([key, value]) => {
        if (key in x) {
          return match(value)(x[key])
        } else {
          return false
        }
      })
    } else {
      return matcher === x
    }
  }
  return predicate
}

type Handler<T = any> = { matcher: Matcher<T>; view: View<T> }

function makeRootRender(
  handlers: Handler[],
  defaultView: View<any>,
): (x: any) => JSX.Element {
  const helper = (parent: any, key: string) => {
    const View = observer(({ p }) => {
      const data = p[key]
      function renderView(view: View<any>): JSX.Element {
        if (typeof view === 'function') {
          const set = (x: any) => {
            setTimeout(() => (p[key] = x), 0)
          }
          let children: any = []
          if (typeof data === 'object' && data !== null) {
            const childEntries = Object.keys(data).map(
              key =>
                [
                  key,
                  {
                    set: (x: any) => {
                      data[key] = x
                    },
                    render: () => helper(data, key),
                  },
                ] as [string, ViewChild],
            )
            if (!Array.isArray(data)) {
              children = {}
            }
            for (const [key, child] of childEntries) {
              children[key] = child
            }
          }
          const result = view(data, { set, children })
          if (result && !(result instanceof Promise)) {
            return <>{result}</>
          } else {
            return <></>
          }
        } else {
          return <>{view}</>
        }
      }

      const handler = handlers.find(h => match(h.matcher)(data))
      if (handler) {
        return renderView(handler.view)
      } else {
        return renderView(defaultView)
      }
    })
    return <View p={parent} />
  }
  return data => {
    const key = 'root'
    const root = observable({ [key]: data })
    ;(window as any).setRoot = (x: any) => (root[key] = x)
    autorun(() => ((window as any).root = toJS(root[key])))
    return helper(root, key)
  }
}

type Primitives = {
  biginit: bigint
  boolean: boolean
  function: (...args: any[]) => any
  number: number
  object: object
  string: string
  symbol: symbol
  undefined: undefined
}

function isType<T extends keyof Primitives>(
  type: T,
): (x: any) => x is Primitives[T] {
  function predicate(x: any): x is Primitives[T] {
    return typeof x === type
  }
  return predicate
}

function isUrl(x: any): x is string {
  return (
    typeof x === 'string' &&
    (x.startsWith('http://') || x.startsWith('https://'))
  )
}

type HandleFuncs = {
  partial<T>(matcher: Matcher<T>, view: View<T>): Handler<T>
  exact<T>(matcher: Matcher<T>, view: View<T>): Handler<T>
  select<T, K extends keyof T>(key: K, view: View<T[K]>): Handler<T>
}

const handleFuncs: HandleFuncs = {
  partial: (matcher, view) => ({ matcher, view }),
  exact: null as any,
  select: null as any,
}

type HandleBase = HandleFuncs['partial']

const handleBase: HandleBase = (m, v) => handleFuncs.partial(m, v)

type Handle = HandleFuncs & HandleBase

const handle: Handle = Object.assign(handleBase, handleFuncs)

const h = handle

async function delay(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(() => resolve(), ms))
}

function text(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const jsonView: View<any> = (obj, { children }) => {
  if (
    typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean' ||
    obj === null
  ) {
    return <code>{JSON.stringify(obj)}</code>
  } else if (_.isArray(obj) || _.isPlainObject(obj)) {
    const isArray = _.isArray(obj)
    const entries = Object.entries(children)
    const opening = isArray ? '[' : '{'
    const closing = isArray ? ']' : '}'
    return (
      <>
        <code>{opening}</code>
        {entries.map(([key, value], i) => (
          <div key={key} style={{ paddingLeft: 16 }}>
            <code>{isArray ? i : JSON.stringify(key)}:&nbsp;</code>
            {value.render()}
            {i !== entries.length - 1 && <code>,</code>}
          </div>
        ))}
        <code>{closing}</code>
      </>
    )
  } else {
    return (
      <b>
        <i>UNHANDLED</i>
      </b>
    )
  }
}

const rootRender = makeRootRender(
  [
    /*
    h(['links', 'selected'], ({ links }, { children: { selected } }) => (
      <div style={{ display: 'flex' }}>
        <Drawer>
          <DrawerHeader>
            <DrawerTitle>Star Wars Api</DrawerTitle>
          </DrawerHeader>
          <DrawerContent>
            <List>
              {Object.entries(links).map(([title, load]) => (
                <ListItem
                  key={title}
                  onClick={() => selected.set({ title, content: { load } })}
                >
                  {text(title)}
                </ListItem>
              ))}
            </List>
          </DrawerContent>
        </Drawer>
        {selected.render()}
      </div>
    )),
    h(['title', 'content'], ({ title }, { children: { content } }) => (
      <div style={{ width: '100%' }}>
        <Toolbar>
          <ToolbarRow>
            <ToolbarTitle>{text(title)}</ToolbarTitle>
          </ToolbarRow>
        </Toolbar>
        {content.render()}
      </div>
    )),
    h(['count', 'results', 'start', 'end'], (data, { set, children }) => {
      const { previous, next, count, start, end, first, last } = data
      async function toPage(url: string) {
        children.results.set({ loading: url })
        const response = await fetch(url)
        const json = await response.json()
        set(json)
      }
      return (
        <>
          <div>
            <IconButton
              icon="first_page"
              disabled={!first}
              onClick={() => toPage(first)}
            />
            <IconButton
              icon="navigate_before"
              disabled={!previous}
              onClick={() => toPage(previous)}
            />
            <IconButton
              icon="navigate_next"
              disabled={!next}
              onClick={() => toPage(next)}
            />
            <IconButton
              icon="last_page"
              disabled={!last}
              onClick={() => toPage(last)}
            />
            <Typography use="body1">
              {start}-{end} of {count}
            </Typography>
          </div>
          {children.results.render()}
        </>
      )
    }),
    h(['count', 'results'], (data, { set }) => {
      const { previous, next, results, count } = data
      function getPage(url: string): number {
        return parseInt(url.match(/page=(\d+)$/)![1])
      }
      const pageSize = 10
      const page = next
        ? getPage(next) - 1
        : previous
        ? getPage(previous) + 1
        : 1
      const start = (page - 1) * pageSize + 1
      const end = start + results.length - 1
      const first = previous && previous.replace(/\d+$/, 1)
      const last =
        next && next.replace(/\d+$/, Math.floor(count / pageSize) + 1)
      set({ ...data, start, end, first, last })
    }),
    h(['ability', 'berry'], (data, { set }) => {
      const [title, load] = Object.entries(data)[0]
      set({ links: data, selected: { title, content: { load } } })
    }),
    */
    // h(['loading'], ({ loading: url }) => `loading (${url})`),
    h({ load: isUrl }, async ({ load: url }, { set }) => {
      set({ loading: url })
      const response = await fetch(url)
      const json = await response.json()
      set({ url, loaded: json })
    }),
    h(
      ['edit_data'],
      (
        { edit_data: obj, input: str, isString },
        { children: { input, edit_data, isString: isStringChild } },
      ) => (
        <>
          <div>
            <textarea value={str} onChange={e => input.set(e.target.value)} />
            <div>
              <label>
                string
                <input
                  type="checkbox"
                  value={isString}
                  onChange={e => isStringChild.set(e.target.checked)}
                />
              </label>
              <br />
              <button onClick={() => edit_data.set(eval(str))}>eval</button>
              <button onClick={() => edit_data.set(JSON.parse(str))}>
                parse
              </button>
              <button onClick={() => input.set(JSON.stringify(obj))}>
                stringify
              </button>
            </div>
          </div>
          {isString ? input.render() : edit_data.render()}
        </>
      ),
    ),
    h(['url', 'loaded'], ({ url }, { set, children }) => (
      <>
        <button onClick={() => set({ load: url })}>reload</button>
        <button onClick={() => set(url)}>unload</button>
        {children.loaded.render()}
      </>
    )),
    h(
      x => isUrl(x) && !!x.match(/\.(jpe?g|gif|png)$/),
      url => <img src={url} />,
    ),
    h(isUrl, (url, { set }) => (
      <a
        href={url}
        onClick={e => {
          set({ load: url })
          e.preventDefault()
        }}
      >
        {url}
      </a>
    )),
  ],
  jsonView,
)

export const App = () =>
  rootRender({
    apis: {
      info:
        'see https://github.com/toddmotto/public-apis for a large list of public apis',
      swapi: 'https://swapi.co/api/',
      pokeapi: 'https://pokeapi.co/api/v2/',
      schemastore: 'http://schemastore.org/api/json/catalog.json',
      dogapi_random: 'https://dog.ceo/api/breeds/image/random',
      chucknorris_random: 'http://api.icndb.com/jokes/random?exclude=[nerdy]',
      meow: 'https://aws.random.cat/meow',
      shlaapi: 'https://rickandmortyapi.com/api/character',
    },
    test: { edit_data: null, input: 'null', isString: false },
  })

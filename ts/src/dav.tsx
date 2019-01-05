import React, { useState, useEffect } from 'react'
import {
  Drawer,
  Button,
  List,
  ListItemText,
  ListItem,
  Divider,
  Typography,
  CssBaseline,
  AppBar,
  Toolbar,
} from '@material-ui/core'
import _ from 'lodash'

type View<T> = React.ComponentType<ViewProps<T>>

type ViewProps<T> = {
  data: T
  render: Render
}

type Render = (data: any) => JSX.Element

type Handler<T = any> = {
  guard: (data: any) => boolean
  view: View<T>
}

function rootRender(...handlers: Handler[]): Render {
  return data => {
    const render = rootRender(...handlers)
    const handler = handlers.find(h => !!h.guard(data))
    if (handler) {
      return <handler.view {...{ data, render }} />
    } else {
      return <></>
    }
  }
}

type Matcher<T> =
  | ((data: any) => data is T)
  | ((data: any) => boolean)
  | string
  | boolean
  | number
  | { [key: string]: Matcher<any> }
  | { [index: number]: Matcher<any> }

function match<T>(matcher: Matcher<T>): (data: any) => data is T {
  function predicate(x: any): x is T {
    if (typeof matcher === 'function') {
      return matcher(x)
    } else if (
      typeof matcher === 'object' &&
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

function handle<T>(matcher: Matcher<T>, view: View<T>): Handler<T> {
  return {
    guard: data => match(matcher)(data),
    view,
  }
}

function isUrl(data: any): data is string {
  return (
    typeof data === 'string' &&
    (data.startsWith('http://') || data.startsWith('https://'))
  )
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) {
      setMounted(true)
    }
  })
  return mounted
}

function useFetch<T>(
  url: string,
  onMount = true,
): {
  loaded: boolean
  loading: boolean
  load: () => void
  data?: T
} {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<T | undefined>(undefined)
  const mounted = useMounted()
  function load() {
    setLoading(true)
    setData(undefined)
    fetch(url)
      .then(res => res.json())
      .then(x => {
        setLoaded(true)
        setLoading(false)
        setData(x)
      })
  }
  useEffect(() => {
    if (onMount && !mounted) {
      load()
    }
  })
  return { loaded, loading, load, data }
}

function displayKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export const App = () =>
  rootRender(
    handle({ people: isUrl, planets: isUrl }, ({ data, render }) => {
      const [selected, setSelected] = useState(Object.keys(data)[0])
      return (
        <div>
          <CssBaseline />
          <AppBar position="sticky">
            <Toolbar>
              <Typography variant="h6">{displayKey(selected)}</Typography>
            </Toolbar>
          </AppBar>
          <Drawer
            title="Star Wars Data"
            variant="permanent"
            anchor="right"
            style={{ flexShrink: 0 }}
          >
            <Typography variant="title" style={{ padding: 8 }}>
              Star Wars
            </Typography>
            <Divider />
            <List>
              {Object.keys(data).map(key => (
                <ListItem key={key} button onClick={() => setSelected(key)}>
                  <ListItemText primary={displayKey(key)} />
                </ListItem>
              ))}
            </List>
          </Drawer>
          <main style={{ flexGrow: 1 }}>{render(data[selected])}</main>
        </div>
      )
    }),
    handle({ load: isUrl }, ({ data: { load: url }, render }) => {
      const { loading, data } = useFetch(url)
      return loading ? <span>loading...</span> : render(data)
    }),
    handle(isUrl, ({ data: url, render }) => {
      const { loaded, loading, load, data } = useFetch(url, false)

      return loading ? (
        <span>loading... {url}</span>
      ) : !loaded ? (
        <Button onClick={load}>load {url}</Button>
      ) : (
        <span>
          <button onClick={load}>reload {url}</button>
          {render(data)}
        </span>
      )
    }),
    handle(Array.isArray, ({ data: xs, render }) => (
      <>
        {xs.map((x, i) => (
          <div key={i}>{render(x)}</div>
        ))}
      </>
    )),
    handle(_.isPlainObject, ({ data, render }) => (
      <>
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            {key}: {render(value)}
          </div>
        ))}
      </>
    )),
    handle(
      () => true,
      ({ data }) => <code>{JSON.stringify(data, null, 2)}</code>,
    ),
  )({ load: 'https://swapi.co/api/' })

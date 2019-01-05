import React from 'react'
import { observable } from 'mobx'
import { observer } from 'mobx-react'
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Typography,
  Toolbar,
  AppBar,
  CssBaseline,
  Tooltip,
  CircularProgress,
  Card,
} from '@material-ui/core'
import _ from 'lodash'

type View<T> = React.ComponentType<ViewProps<T>>

type ViewProps<T> = {
  data: T
  key: string
  path: string[]
  set: (data: any) => JSX.Element
}

type Render = (data: any, key?: string, path?: string[]) => JSX.Element

type Handler<T = any> = {
  guard: (data: any) => boolean
  view: View<T>
  name?: string
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

function handle<T>(
  matcher: Matcher<T>,
  view: View<T>,
  name?: string,
): Handler<T> {
  return {
    guard: data => match(matcher)(data),
    view,
    name,
  }
}

function makeRender(handlers: Handler[]): Render {
  function render(
    parent: any,
    key: string,
    path: string[],
    set: (data: any) => JSX.Element,
  ): JSX.Element {
    const props: ViewProps<any> = { data: null, key, path, set }
    const View = observer(({ p }) => {
      const handler = handlers.find(
        h => h.guard({ ...props, data: parent[key] }) || h.guard(parent[key]),
      )
      if (handler) {
        return <handler.view {...{ ...props, data: p[key] }} />
      } else {
        return <></>
      }
    })
    return <View p={parent} />
  }
  return (data, key = '', path = []) => {
    const root = observable({ [key]: data })
    return render(root, key, path, x => {
      root[key] = x
      return <></>
    })
  }
}

function isUrl(data: any): data is string {
  return (
    typeof data === 'string' &&
    (data.startsWith('http://') || data.startsWith('https://'))
  )
}

function displayKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

const render = makeRender([
  handle({ people: isUrl }, ({ data: links, set }) =>
    set({ links, selected: 'people' }),
  ),
  handle(
    { links: { people: isUrl }, selected: x => typeof x === 'string' },
    ({ data }) => {
      const drawerWidth = 157
      return (
        <div>
          <CssBaseline />
          <AppBar position="sticky" style={{ marginLeft: drawerWidth }}>
            <Toolbar>
              <Typography variant="h6">{displayKey(data.selected)}</Typography>
            </Toolbar>
          </AppBar>
          <Drawer
            variant="permanent"
            style={{ width: drawerWidth, flexShrink: 0 }}
          >
            <Typography variant="title" style={{ padding: 8 }}>
              Star Wars Data
            </Typography>
            <Divider />
            <List disablePadding>
              {Object.keys(data.links).map(key => (
                <ListItem
                  key={key}
                  button
                  onClick={() => (data.selected = key)}
                >
                  <ListItemText primary={displayKey(key)} />
                </ListItem>
              ))}
            </List>
          </Drawer>
          <main style={{ paddingLeft: drawerWidth }}>
            {render({ load: data.links[data.selected] })}
          </main>
        </div>
      )
    },
  ),
  handle(
    { count: x => typeof x === 'number' },
    ({ data: { count, next, previous, results }, set }) => (
      <div>
        <div>
          <span>
            {_.first<any>(results).url.match(/(\d+)\/$/)[1]}-
            {_.last<any>(results).url.match(/(\d+)\/$/)[1]} of {count}
          </span>
          <Button
            disabled={previous === null}
            onClick={() => set({ load: previous })}
          >
            Previous
          </Button>
          <Button disabled={next === null} onClick={() => set({ load: next })}>
            Next
          </Button>
        </div>
        {render(results)}
      </div>
    ),
  ),
  handle({ load: isUrl }, ({ data: { load: url }, set }) => {
    set({ loading: true })
    fetch(url).then(async res => set(await res.json()))
    return <></>
  }),
  handle(isUrl, ({ data: url, set }) => (
    <Tooltip title={url}>
      <Button
        variant="contained"
        onClick={() => {
          fetch(url).then(async res => set(await res.json()))
          return set({ loading: true })
        }}
      >
        Load
      </Button>
    </Tooltip>
  )),
  handle({ loading: true }, () => <CircularProgress />),
  handle(Array.isArray, ({ data }) => (
    <>
      {data.map((x, i) => (
        <div key={i}>
          <div>{render(x)}</div>
          {i === data.length - 1 || <Divider />}
        </div>
      ))}
    </>
  )),
  // handle(_.isPlainObject, ({ data }) => (
  //   <>
  //     {Object.entries(data).map(([key, value]) => (
  //       <Card key={key}>{render(value)}</Card>
  //     ))}
  //   </>
  // )),
  handle(() => true, ({ data }) => <pre>{JSON.stringify(data, null, 2)}</pre>),
])

export const App = () => render({ load: 'https://swapi.co/api/' })

import React from 'react'
import _ from 'lodash'
import Async from 'react-promise'
import axios from 'axios'
import Inspector from 'react-inspector'

type View<T = any> = {
  name?: string
  matcher: Matcher
  component: React.ComponentType<ViewComponentProps<T>>
}

type ViewComponentProps<T> = {
  data: T
  options: any
  views: ViewContainer
  self: View<T>
}

type Matcher = ((data: any) => boolean) | { type: string }

function match(data: any, matcher: Matcher): boolean {
  if (typeof matcher === 'function') {
    return matcher(data)
  } else {
    return (
      typeof data === 'object' &&
      typeof data.type === 'string' &&
      data.type === matcher.type
    )
  }
}

class ViewContainer {
  private views: View[]

  constructor(views: View[], fallback: View['component']) {
    this.views = views.concat({ matcher: () => true, component: fallback })
  }

  get(data: any, options?: any): JSX.Element {
    const view = this.views.find(v => match(data, v.matcher))!
    return <view.component {...{ data, options, views: this, self: view }} />
  }
}

const primitiveView: View<boolean | number | string | null> = {
  name: 'primitive',
  matcher: x =>
    typeof x === 'boolean' ||
    typeof x === 'number' ||
    typeof x === 'string' ||
    typeof x === 'undefined' ||
    x === null,
  component: ({ data }) => (
    <code>
      {typeof data === 'undefined' ? 'undefined' : JSON.stringify(data)}
    </code>
  ),
}

const arrayView: View<any[]> = {
  name: 'array',
  matcher: Array.isArray,
  component: ({ data, views }) => (
    <>
      <code>[</code>
      <div style={{ paddingLeft: 16 }}>
        {data.map((x, i) => (
          <div key={i}>
            <code>{i}: </code>
            {views.get(x)}
          </div>
        ))}
      </div>
      <code>]</code>
    </>
  ),
}

const objectView: View<object> = {
  name: 'object',
  matcher: _.isPlainObject,
  component: ({ data, views }) => (
    <>
      <code>{'{'}</code>
      <div style={{ paddingLeft: 16 }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <code>{JSON.stringify(key)}: </code>
            {views.get(value)}
          </div>
        ))}
      </div>
      <code>{'}'}</code>
    </>
  ),
}

const promiseView: View<Promise<any>> = {
  name: 'promise',
  matcher: x => x instanceof Promise,
  component: ({ data, views }) => (
    <Async
      promise={data}
      pending={() => <span>resolving...</span>}
      then={x => views.get(x)}
      catch={x => {
        ;(window as any).error = x
        return views.get(x)
      }}
    />
  ),
}

const callView: View<() => any> = {
  name: 'call',
  matcher: x => typeof x === 'function' && x.length === 0,
  component: class extends React.Component<ViewComponentProps<() => any>> {
    state = { called: false, result: undefined }

    render() {
      const { views } = this.props
      const { called, result } = this.state
      return (
        <>
          <button onClick={this.handleCall}>call</button>
          {called && views.get(result)}
        </>
      )
    }

    handleCall = () => {
      const result = this.props.data()
      this.setState({ called: true, result })
    }
  },
}

const chuckView: View<{
  type: 'chuck'
  value: { id: number; joke: string }
}> = {
  name: 'chuck',
  matcher: { type: 'chuck' },
  component: ({ data }) => (
    <span dangerouslySetInnerHTML={{ __html: data.value.joke }} />
  ),
}

const container = new ViewContainer(
  [chuckView, primitiveView, arrayView, promiseView, callView, objectView],
  ({ data }) => (
    <span style={{ background: 'red' }}>
      UNHANDLED <Inspector {...{ data }} />
    </span>
  ),
)

const root = {
  type: 'text',
  children: [
    {
      type: 'paragraph',
      children: [
        {
          type: 'line',
          children: [],
        },
      ],
    },
  ],
  rand: () => Math.random(),
  chuck: () =>
    axios
      // .get('http://api.icndb.com/jokes/164')
      .get('http://api.icndb.com/jokes/random')
      .then(x => x.data)
      .then(x => ({ type: 'chuck', value: x.value })),
}

export const App = () => container.get(root)

import React from 'react'

export = vtree
namespace vtree {
  export interface View<T = any> {
    value: T
    children: { [K in keyof T]: View<T[K]> }
    self: View<T>
    key: string
    path: string[]
    root: View<any>
    matchers: Matcher<any>[]
    usedMatcher?: Matcher<T>
    render(): JSX.Element
    renderChildren(): JSX.Element
    set(value: any): void
    set(update: (value: T) => any): void
    merge(value: object): void
    merge(update: (value: T) => object): void
    match<A>(pattern: Pattern<A>, node: ViewNode): View<T>
    match<A>(
      pattern: Pattern<A>,
      render: (view: View<A>) => ViewNode | void,
    ): View<T>
    match<A>(matcher: Matcher<A>): View<T>
    include(view: View<any>): View<T>
    start(value: any): JSX.Element
  }

  export type ViewNode =
    | JSX.Element
    | string
    | number
    | boolean
    | null
    | undefined
    | Promise<void>
    | ViewNodeArray
    | View

  export interface ViewNodeArray extends Array<ViewNode> {}

  export interface Matcher<T> {
    guard(view: View<T>): boolean
    render(view: View<T>): ViewNode | void
  }

  export type Pattern<T> =
    | ((value: any) => value is T)
    | ((value: any) => boolean)
    | (new (...args: any) => T)
    | { [K in keyof T]?: Pattern<T[K]> }
    | symbol
    | object
    | string
    | bigint
    | number
    | boolean
    | null
    | undefined

  export interface PatternArray<T> extends Array<Pattern<T>> {}

  export type UnBox<T> = T extends String
    ? string
    : T extends Number
    ? number
    : T extends Boolean
    ? boolean
    : T extends Symbol
    ? symbol
    : T

  export function matchesPattern<T>(
    pattern: Pattern<T>,
    value: any,
    partial = false,
  ): value is T {
    // TODO
    return false
  }

  export function is<T>(
    constructor: new (...args: any) => T,
  ): (value: any) => value is UnBox<T>
  export function is(constructor: any): (value: any) => boolean {
    return value => {
      if (constructor === String) {
        return typeof value === 'string'
      } else if (constructor === Number) {
        return typeof value === 'number'
      } else if (constructor === Boolean) {
        return typeof value === 'boolean'
      } else if (constructor === Symbol) {
        return typeof value === 'symbol'
      } else {
        return value instanceof constructor
      }
    }
  }

  export function cast<T>(): (value: any) => value is T {
    return (() => true) as any
  }

  export function exact<T>(pattern: Pattern<T>): (value: any) => value is T {
    function predicate(value: any): value is T {
      return matchesPattern(pattern, value, false)
    }
    return predicate
  }

  export function partial<T>(pattern: Pattern<T>): (value: any) => value is T {
    function predicate(value: any): value is T {
      return matchesPattern(pattern, value, true)
    }
    return predicate
  }

  export function render(view: View): JSX.Element {
    const reversed = view.matchers.slice(0).reverse()
    const found = reversed.find(({ guard }) => guard(view))
    if (found) {
      return renderViewNode(found.render(view))
    } else {
      return <></>
    }
  }

  function renderViewNode(node: ViewNode | void): JSX.Element {
    if (node instanceof Promise) {
      return <></>
    } else if (Array.isArray(node)) {
      return <>{node.map(renderViewNode)}</>
    } else if (isView(node)) {
      return node.render()
    } else {
      return <>{node}</>
    }
  }

  function isView(value: any): value is View {
    return (
      typeof value === 'object' &&
      value !== null &&
      'value' in value &&
      'children' in value &&
      'render' in value
    )
  }

  export function renderChildren(view: View): JSX.Element {
    return (
      <>
        {Object.values(view.children).map(x => (
          <React.Fragment key={x.key}>{x.render()}</React.Fragment>
        ))}
      </>
    )
  }

  export function set(view: View, value: any): void
  export function set(view: View, update: (value: any) => any): void
  export function set(view: View, arg: any): void {
    if (typeof arg === 'function') {
      view.set(arg(view.value))
    } else {
      throw new Error('set not implimented')
    }
  }

  export function merge(view: View, value: object): void
  export function merge(view: View, update: (value: any) => object): void
  export function merge(view: View, arg: any): void {
    if (typeof arg === 'function') {
      view.merge(arg(view.value))
    } else {
      view.set(Object.assign({}, view.value, arg))
    }
  }

  export function match<A>(
    view: View,
    pattern: Pattern<A>,
    node: ViewNode,
  ): View
  export function match<A>(
    view: View,
    pattern: Pattern<A>,
    render: (view: View<A>) => ViewNode | void,
  ): View
  export function match<A>(view: View, matcher: Matcher<A>): View
  export function match(view: View, ...args: any[]): View {
    let matcher: Matcher<any>
    if (args.length === 1) {
      matcher = args[0]
    } else {
      matcher = {
        guard: view => matchesPattern(args[0], view.value, false),
        render: typeof args[1] === 'function' ? args[1] : () => args[1],
      }
    }
    return { ...view, matchers: view.matchers.concat(matcher) }
  }

  export function include(view: View, other: View): View {
    return Object.assign({}, view, {
      matchers: view.matchers.concat(other.matchers),
    })
  }

  export function start(view: View, value: any): JSX.Element {
    view.set(value)
    return view.render()
  }

  export function createView(): View<undefined> {
    const root: View<undefined> = {
      value: undefined,
      children: {} as any,
      self: null as any,
      key: '',
      path: [],
      root: null as any,
      matchers: [],
      render() {
        return render(this)
      },
      renderChildren() {
        return renderChildren(this)
      },
      set(arg: any) {
        set(this, arg)
      },
      merge(arg: any) {
        merge(this, arg)
      },
      match(...args: [any]) {
        return match(this, ...args)
      },
      include(arg: any) {
        return include(this, arg)
      },
      start(arg: any) {
        return start(this, arg)
      },
    }
    root.self = root
    root.root = root
    return root
  }
}

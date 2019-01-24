import React from 'react'

export = vtree
namespace vtree {
  export class View<T, R> {
    static create<R = any>(): View<undefined, R>
    static create<T, R = T>(value: T): View<T, R>
    static create(value?: any): View<any, any> {
      return new View(value)
    }

    static component<T>(
      render: (view: View<T, T>) => ViewNode | void,
    ): React.StatelessComponent<T> {
      return value =>
        this.create()
          .matchPath([], render)
          .component(value)(value)
    }

    value: T
    children: { [K in keyof T]: View<T[K], R> } = {} as any
    self: View<T, R> = this
    key: string
    path: string[]
    parent?: View<any, R>
    root: View<R, R>
    matchers: Matcher<any, R>[]
    usedMatcher?: Matcher<T, R>

    private refresh?: () => void

    private constructor(
      value: T,
      key = '',
      path: string[] = [],
      parent?: View<any, any>,
      root?: View<any, any>,
      matchers: Matcher<any, R>[] = [],
    ) {
      this.value = value
      this.key = key
      this.path = path
      this.parent = parent
      this.root = typeof root === 'undefined' ? (this as any) : root
      this.matchers = matchers
      this.updateChildren()

      this.render = this.render.bind(this) as any
      this.set = this.set.bind(this)
      this.merge = this.merge.bind(this)
      this.match = this.match.bind(this) as any
      this.matchPath = this.matchPath.bind(this) as any
      this.matchKey = this.matchKey.bind(this) as any
      this.include = this.include.bind(this)
      this.component = this.component.bind(this) as any
    }

    render(): JSX.Element {
      const view = this
      const reversed = view.matchers.slice(0).reverse()
      class Container extends React.Component {
        static displayName = `View[${view.key}]`

        state = { view }

        componentDidMount() {
          view.refresh = () => this.setState(this.state)
        }

        render() {
          const found = reversed.find(({ guard }) => guard(view))
          if (found) {
            view.usedMatcher = found
            if (typeof found.result === 'function') {
              return renderViewNode(found.result(view))
            } else {
              return renderViewNode(found.result)
            }
          } else {
            return <></>
          }
        }
      }
      return <Container />
    }

    set(update: (value: T) => any): void
    set(value: any): void
    set(value: any): void {
      if (typeof value === 'function') {
        this.set(value(this.value))
      } else {
        this.value = value
        this.updateChildren()

        let current = this.self
        let parent = this.parent
        let key = this.key
        while (parent && !current.usedMatcher) {
          parent.value[key] = current.value
          current = parent
          parent = parent.parent
          key = current.key
        }
        if (current.refresh) {
          current.refresh()
        }
        // TODO merge into parent (or not? really bad performance)
        // if (this.parent) {
        //   this.parent.merge({ [this.key]: value })
        // }
        // https://www.npmjs.com/package/deep-diff
        // do we even want to do this?
        // it breaks parent structural matching if the child changes structure
        // then again, that might be a way children talk to parents/siblings
        // but... value and children are out of sync...
        // and that can be super confusing
        // should I really go back to mobx??
        // what about child values and children as getters of the root?
        // currently merge into ancestors if not rendered...
        // that probalby has some unintuitive consequences
      }
    }

    merge(update: (value: T) => object): void
    merge(value: object): void
    merge(value: any): void {
      if (typeof value === 'function') {
        this.merge(value(this.value))
      } else {
        this.set(Object.assign({}, this.value, value))
      }
    }

    match<A = any>(pattern: Pattern<A>, result: MatchResult<A, R>): View<T, R>
    match<A = any>(matcher: Matcher<A, R>): View<T, R>
    match(matchers: Matcher<any, R>[]): View<T, R>
    match(...args: any[]): View<T, R> {
      if (args.length === 1) {
        if (Array.isArray(args[0])) {
          this.matchers.push(...args[0])
        } else {
          this.matchers.push(args[0])
        }
      } else {
        const [pattern, result] = args
        this.matchers.push({
          guard: view => patternMatches(pattern, view.value, false),
          result,
        })
      }
      return this
    }

    matchPath<A = any>(path: string[], result: MatchResult<A, R>): View<T, R>
    matchPath<A = any>(
      predicate: (path: string[]) => boolean,
      result: MatchResult<A, R>,
    ): View<T, R>
    matchPath(
      path: Function | string[],
      result: MatchResult<any, R>,
    ): View<T, R> {
      this.matchers.push({
        guard: view =>
          typeof path === 'function'
            ? path(view.path)
            : path.length === view.path.length &&
              path.every((k, i) => view.path[i] === k),
        result,
      })
      return this
    }

    matchKey<A = any>(key: string, result: MatchResult<A, R>): View<T, R> {
      return this.matchPath(p => key === p[p.length - 1], result)
    }

    include(view: View<any, R>): View<T, R> {
      // FIXME broken?
      this.matchers.push(...view.matchers)
      return this
    }

    component(): React.StatelessComponent<T>
    component(value: any): React.StatelessComponent
    component(...args: any[]): React.StatelessComponent<any> {
      const view = this
      if (args.length === 0) {
        return function ViewRoot(value) {
          view.set(value)
          return view.render()
        }
      } else {
        return function ViewRoot() {
          view.set(args[0])
          return view.render()
        }
      }
    }

    private updateChildren(): void {
      // TODO make this smarter
      let children: any = {}
      if (Array.isArray(this.value)) {
        children = []
      }
      if (typeof this.value === 'object' && this.value !== null) {
        for (const [key, value] of Object.entries(this.value)) {
          children[key] = new View(
            value,
            key,
            this.path.concat(key),
            this,
            this.root,
            this.matchers.slice(0),
          )
        }
      }
      this.children = children
    }
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
    | View<any, any>

  export interface ViewNodeArray extends Array<ViewNode> {}

  export interface Matcher<T, R> {
    guard(view: View<T, R>): boolean
    result: MatchResult<T, R>
  }

  type MatchResult<T, R> = ViewNode | ((view: View<T, R>) => ViewNode | void)

  export type Pattern<T> =
    | ((value: any) => value is T)
    | ((value: any) => boolean)
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

  export function patternMatches<T>(
    pattern: Pattern<T>,
    value: any,
    partial = false,
  ): value is T {
    if (typeof pattern === 'function') {
      return (pattern as any)(value)
    } else if (
      typeof pattern === 'object' &&
      pattern !== null &&
      typeof value === 'object' &&
      value !== null
    ) {
      const matches = Object.entries(pattern).every(([key, p]) => {
        if (key in value) {
          return patternMatches(p, value[key], partial)
        } else {
          return false
        }
      })
      if (partial) {
        return matches
      } else {
        return (
          matches && Object.keys(pattern).length === Object.keys(value).length
        )
      }
    } else {
      return pattern === value
    }
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

  export function any(value: any): value is any {
    return true
  }

  export function exact<T>(pattern: Pattern<T>): (value: any) => value is T {
    function predicate(value: any): value is T {
      return patternMatches(pattern, value, false)
    }
    return predicate
  }

  export function partial<T>(pattern: Pattern<T>): (value: any) => value is T {
    function predicate(value: any): value is T {
      return patternMatches(pattern, value, true)
    }
    return predicate
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

  function isView(value: any): value is View<any, any> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'value' in value &&
      'children' in value &&
      'render' in value
    )
  }
}

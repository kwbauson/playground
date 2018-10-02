import React from 'react'
import { observable, action } from 'mobx'
import { observer } from 'mobx-react'
import shortid from 'shortid'

type AST<T extends keyof G, G extends Grammar<G>> = {
  type: T
} & (G[T] extends { children: any; value: any }
  ? {
      children: AST<G[T]['children'], G>[]
      value: G[T]['value']
    }
  : G[T] extends { children: any }
    ? {
        children: AST<G[T]['children'], G>[]
      }
    : G[T] extends { value: any }
      ? {
          value: G[T]['value']
        }
      : {})

type Grammar<G extends Grammar<G>> = {
  [K in keyof G]:
    | { children: keyof G; value: any }
    | { children: keyof G }
    | { value: any }
}

type Display = JSX.Element

type Handlers<G extends Grammar<G>> = { [T in keyof G]: Handle<T, G> }

interface Handle<T extends keyof G, G extends Grammar<G>> {
  view: (props: ViewProps<T, G>) => Display
  actions?: {
    [name: string]: {
      key?: string
      call: (x: AST<T, G>) => void
    }
  }
}

type ViewProps<T extends keyof G, G extends Grammar<G>> = {
  node: Wrapped<AST<T, G>>
  children: Display[]
}

type Wrapped<T> = { [K in keyof T]: T[K] } & {
  key: string
  selected: boolean
  parent?: Wrapped<any>
  index?: number
}

function wrapTree<T>(
  tree: T,
  parent?: Wrapped<any>,
  index?: number,
): Wrapped<T> {
  const result: Wrapped<any> = {
    ...(tree as any),
    key: shortid(),
    selected: false,
    parent,
    index,
  }
  if (hasChildren(tree)) {
    result.children = tree.children.map((x, i) => wrapTree(x, result, i))
  }
  return result as any
}

function hasChildren(obj: any): obj is { children: any[] } {
  return obj.children && typeof obj.children.length === 'number'
}

function astView<S extends keyof G, G extends Grammar<G>>(
  handler: Handlers<G>,
  node: Wrapped<AST<S, G>>,
): Display {
  const type = node.type as S
  const view = handler[type].view
  let children: Display[] = []
  if ('children' in node) {
    children = ((node as unknown) as { children: any[] }).children.map(x => (
      <React.Fragment key={x.key}>{astView(handler, x)}</React.Fragment>
    ))
  }
  return view({ node, children })
}

function rootAstView<S extends keyof G, G extends Grammar<G>>(
  handler: Handlers<G>,
  tree: AST<S, G>,
): Display {
  const node = wrapTree(tree)
  return astView(handler, node)
}

interface TextGrammar
  extends Grammar<{
      text: { children: 'line' }
      line: { children: 'char' }
      char: { value: string }
    }> {}

function parseText(text: string): AST<'text', TextGrammar> {
  const lines = text.split('\n').map(parseLine)
  return {
    type: 'text',
    children: lines,
  }
}

function parseLine(line: string): AST<'line', TextGrammar> {
  const chars = line.split('').map(parseChar)
  return {
    type: 'line',
    children: chars,
  }
}

function parseChar(char: string): AST<'char', TextGrammar> {
  return {
    type: 'char',
    value: char,
  }
}

const textView = rootAstView<'text', TextGrammar>(
  {
    text: {
      view: ({ children }) => <div>{children}</div>,
    },
    line: {
      view: ({ children }) => <div>{children}</div>,
    },
    char: {
      view: ({ node }) => <span>{node.value}</span>,
    },
  },
  parseText('line 1\nline 2\nline 3'),
)

export const App = () => textView

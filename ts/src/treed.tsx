import React from 'react'
import shortid from 'shortid'

type Tree<T> = {
  label: T
  children: Tree<T>[]
  key: string
}

interface ViewTypes {}

interface Label<T extends keyof ViewTypes = keyof ViewTypes> {
  type: T
  value: ViewTypes[T]
  selected: boolean
  expanded: boolean
}

type Display = JSX.Element

interface ViewProps<T extends keyof ViewTypes> {
  label: Label<T>
  children: Display[]
}

interface View<T extends keyof ViewTypes = keyof ViewTypes> {
  type: T
  (props: ViewProps<T>): Display
}

interface ViewTypes {
  text: string
  line: string
  char: string
  bool: boolean
}

function mkView<T extends keyof ViewTypes>(
  type: T,
  f: (props: ViewProps<T>) => Display,
): View<T> {
  const view = f as View<T>
  view.type = type
  return view
}

const textView = mkView('text', ({ children }) => <div>{children}</div>)

const lineView = mkView('line', ({ children }) => <div>{children}</div>)

const charView = mkView('char', ({ label }) => <span>{label.value}</span>)

function textTree(text: string): Tree<Label> {
  const lines = text.split('\n')
  return {
    label: {
      type: 'text',
      value: text,
      selected: true,
      expanded: true,
    },
    children: lines.map(textLineTree),
    key: shortid(),
  }
}

function textLineTree(line: string): Tree<Label> {
  const chars = line.split('')
  return {
    label: {
      type: 'line',
      value: line,
      selected: false,
      expanded: true,
    },
    children: chars.map(textCharTree),
    key: shortid(),
  }
}

function textCharTree(char: string): Tree<Label> {
  return {
    label: {
      type: 'char',
      value: char,
      selected: false,
      expanded: true,
    },
    children: [],
    key: shortid(),
  }
}

function viewTree(views: View<any>[], tree: Tree<Label>): JSX.Element {
  const view = views.find(x => x.type === tree.label.type)!
  return view({
    label: tree.label,
    children: tree.children.map(x => (
      <React.Fragment key={x.key}>{viewTree(views, x)}</React.Fragment>
    )),
  })
}

export const App = () =>
  viewTree([textView, lineView, charView], textTree('line 1\nline 2\nline 3'))

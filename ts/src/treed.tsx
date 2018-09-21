import React, { CSSProperties } from 'react'
import { observable, action } from 'mobx'
import { observer } from 'mobx-react'
import shortid from 'shortid'

type AST<T extends keyof G, G extends Grammar<G>> = {
  type: T
  selected: boolean
} & (G[T] extends { children: GrammarChildren<G>; value: any }
  ? { children: ASTChildren<T, G>; value: G[T]['value'] }
  : G[T] extends { children: GrammarChildren<G> }
    ? { children: ASTChildren<T, G> }
    : G[T] extends { value: any } ? { value: G[T]['value'] } : {})

type ASTChildren<T extends keyof G, G extends Grammar<G>> = G[T] extends {
  children: GrammarChildren<G>
}
  ? { [C in keyof G[T]['children']]: AST<G[T]['children'][C], G> }
  : {}

type Grammar<G> = {
  [K in keyof G]: { children?: GrammarChildren<G>; value?: any }
  // | { children: GrammarChildren<G> }
  // | { value: any }
  // | {}
}

type GrammarChildren<G> = (keyof G)[] | { [key: string]: keyof G }

type Handler<G extends Grammar<G>> = {
  [T in keyof G]: {
    view: G[T] extends { children: any }
      ? (x: AST<T, G>, children: Display[]) => Display
      : (x: AST<T, G>) => Display
    actions?: {
      [name: string]: {
        key?: string
        call: (x: AST<T, G>) => void
      }
    }
  }
}

function astView<S extends keyof G, G extends Grammar<G>>(
  handler: Handler<G>,
  tree: AST<S, G>,
): Display {
  return <></>
}

const view = astView<
  'root',
  {
    // root: { value: string }
    root: { children: ['text'] }
    text: { children: 'line'[] }
    line: { children: 'char'[] }
    char: { value: string }
  }
>(
  {
    // root: {
    //   view: x => <>{x.value}</>,
    // },
    root: {
      view: (x, children) => <div>{children}</div>,
    },
    text: {
      view: (x, children) => <div>{children}</div>,
    },
    line: {
      view: (x, children) => <div>{children}</div>,
    },
    char: {
      view: x => <span>{x.value}</span>,
    },
  },
  {
    type: 'root',
    children: [
      {
        type: 'text',
        children: [],
      },
    ],
  },
)

type Tree<T extends ViewType = ViewType> = {
  key: string
  label: Label<T>
  children: Tree[]
  parent?: Tree
}

type ViewType = keyof ViewTypes
interface ViewTypes {}

interface Label<T extends ViewType = ViewType> {
  type: T
  value: ViewTypes[T]
  selected: boolean
  expanded: boolean
}

type Display = JSX.Element

interface ViewProps<T extends ViewType> {
  label: Label<T>
  children: Display[]
}

interface View<T extends ViewType = ViewType> {
  type: T
  (props: ViewProps<T>): Display
}

interface ViewTypes {
  text: string
  line: string
  char: string
}

function mkView<T extends ViewType>(
  type: T,
  f: (props: ViewProps<T>) => Display,
): View<T> {
  const view = f as View<T>
  view.type = type
  return view
}

function getSelected(tree: Tree): Tree[] {
  const selectedChildren = tree.children
    .map(getSelected)
    .reduce((a, x) => a.concat(x), [])
  if (tree.label.selected) {
    return [tree, ...selectedChildren]
  } else {
    return selectedChildren
  }
}

function setParents(tree: Tree, parent?: Tree): void {
  tree.parent = parent
  tree.children.forEach(x => setParents(x, tree))
}

function selectFirstChild(tree: Tree): void {
  if (tree.children.length > 0) {
    tree.label.selected = false
    tree.children[0].label.selected = true
  }
}

function selectParent(tree: Tree): void {
  if (tree.parent) {
    tree.label.selected = false
    tree.parent.label.selected = true
  }
}

function selectPreviousSibling(tree: Tree): void {
  if (tree.parent) {
    const idx = tree.parent.children.findIndex(x => x === tree)!
    if (idx > 0) {
      tree.label.selected = false
      tree.parent.children[idx - 1].label.selected = true
    }
  }
}

function selectNextSibling(tree: Tree): void {
  if (tree.parent) {
    const idx = tree.parent.children.findIndex(x => x === tree)!
    if (idx < tree.parent.children.length - 1) {
      tree.label.selected = false
      tree.parent.children[idx + 1].label.selected = true
    }
  }
}

function textTree(text: string): Tree<'text'> {
  const lines = text.split('\n')
  return {
    key: shortid(),
    label: {
      type: 'text',
      value: text,
      selected: true,
      expanded: true,
    },
    children: lines.map(textLineTree),
  }
}

function textLineTree(line: string): Tree<'line'> {
  const chars = line.split('')
  return {
    key: shortid(),
    label: {
      type: 'line',
      value: line,
      selected: false,
      expanded: true,
    },
    children: chars.map(textCharTree),
  }
}

function textCharTree(char: string): Tree<'char'> {
  return {
    key: shortid(),
    label: {
      type: 'char',
      value: char,
      selected: false,
      expanded: true,
    },
    children: [],
  }
}

function viewTree(
  views: { [K in ViewType]: View<K> },
  tree: Tree,
): JSX.Element {
  const view = views[tree.label.type] as View<ViewType>
  return view({
    label: tree.label,
    children: tree.children.map(x => (
      <React.Fragment key={x.key}>{viewTree(views, x)}</React.Fragment>
    )),
  })
}

function rootViewTree(
  views: { [K in ViewType]: View<K> },
  tree: Tree,
): JSX.Element {
  tree = observable(tree)
  setParents(tree)
  ;(window as any).tree = tree

  let op: (f: (x: Tree) => void) => void = f => {
    const selected = getSelected(tree)
    selected.forEach(f)
  }
  op = action(op)

  const View = observer(() => viewTree(views, tree))

  @observer
  class ViewContainer extends React.Component {
    private ref: React.RefObject<HTMLDivElement>

    constructor(props: {}) {
      super(props)
      this.ref = React.createRef()
    }

    componentDidMount() {
      this.ref.current!.focus()
    }

    render() {
      const selected = getSelected(tree)
      return (
        <div>
          <div
            style={{
              padding: 50,
            }}
            ref={this.ref}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'l') {
                op(selectFirstChild)
              } else if (e.key === 'h') {
                op(selectParent)
              } else if (e.key === 'j') {
                op(selectNextSibling)
              } else if (e.key === 'k') {
                op(selectPreviousSibling)
              }
            }}
          >
            <View />
          </div>
          {selected.map(x => x.label.type)}
        </div>
      )
    }
  }
  return <ViewContainer />
}

function selectedStyle(selected: boolean): CSSProperties {
  return {
    border: selected ? '1px solid black' : undefined,
  }
}

export const App = () =>
  rootViewTree(
    {
      text: mkView('text', ({ label, children }) => (
        <div style={selectedStyle(label.selected)}>{children}</div>
      )),
      line: mkView('line', ({ label, children }) => (
        <div style={selectedStyle(label.selected)}>{children}</div>
      )),
      char: mkView('char', ({ label }) => (
        <span style={{ ...selectedStyle(label.selected) }}>{label.value}</span>
      )),
    },
    textTree('line 1\nline 2\nline 3'),
  )

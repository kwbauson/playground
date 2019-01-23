export type Tree<T> = {
  value: T
  parent?: Tree<T>
  children: Tree<T>[]
}

function Tree<T>(
  value: T,
  children: Tree<T>[] = [],
  parent?: Tree<T>,
): Tree<T> {
  const self: Tree<T> = {
    value,
    children: children.map(x => Tree(x.value, x.children, self)),
    parent,
  }
  return self
}

function findParent<T>(
  tree: Tree<T>,
  predicate: (x: T) => boolean,
): T | undefined {
  if (typeof tree.parent === 'undefined') {
    return
  } else {
    if (predicate(tree.parent.value)) {
      return tree.parent.value
    } else {
      return findParent(tree.parent, predicate)
    }
  }
}

interface LangNode
  extends Tree<
    | string
    | { bind: string; lang: Lang }
    | { ref: string }
    | { quot: Lang; from: Lang }
  > {}

type Lang = LangNode[]

function foo(lang: Lang) {
  lang[0].value
}

import React from 'react'
import { observable } from 'mobx'
import _ from 'lodash'

type View<T, R> = ViewFunc<T, R> | ViewNode

type ViewFunc<T, R> = (tree: Tree<T, R>) => ViewNode | void

type ViewNode =
  | JSX.Element
  | string
  | false
  | null
  | undefined
  | Promise<any>
  | { [index: number]: ViewNode }

type Tree<T = any, R = any> = {
  value: T
  children: { [K in keyof T]: Tree<T[K], R> }
  path: string[]
  root: Tree<R, R>
  self: Tree<T, R>
  set(x: any): void
  update(f: (x: T) => any): void
  render(): ViewNode
  renderChildren(): ViewNode
  match: {
    <A>(pattern: Pattern<A>, view: View<A, R>): Tree<T, R>
    partial<A>(pattern: Pattern<A>, view: View<A, R>): Tree<T, R>
    exact<A>(pattern: Pattern<A>, view: View<A, R>): Tree<T, R>
    select<A, K extends keyof T>(key: K, view: View<T[K], R>): Tree<T, R>
    path(path: string[]): Tree<T, R>
  }
}

declare function create<T>(value: T): Tree<T, T>

const root = create({})
  .match(() => true, ({}) => null)
  .match(() => false, false)
  .render()

type Pattern<T> = any

function setRoot(tree: Tree, root: Tree): void {
  tree.root = root
  for (const childTree of Object.values(tree.children)) {
    setRoot(childTree, root)
  }
}

export function mapChildren<T, U>(value: T[], f: (x: T, key: string) => U): U[]
export function mapChildren<T, U>(
  value: T,
  f: (x: any, key: string) => U,
): { [K in keyof T]: U }
export function mapChildren<T, U>(
  value: T,
  f: (x: any, key: string) => U,
): { [K in keyof T]: U } {
  let result: any
  if (Array.isArray(value)) {
    result = []
  } else {
    result = {}
  }
  for (const [k, v] of Object.entries(value)) {
    result[k] = f(v, k)
  }
  return result
}

export function setAt(obj: any, path: string[], value: any): void {
  path.forEach((key, i) => {
    if (i < path.length - 1) {
      obj = obj[key]
    } else {
      obj[key] = value
    }
  })
}

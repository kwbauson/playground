import React from 'react'

type Tree<T> = {
  label: T
  children: Tree<T>[]
}

const Char = Symbol('Char')

interface ViewTypes {
  [Char]: string
}

type TaggedViewTypes = {
  [T in keyof ViewTypes]: {
    type: T
    value: ViewTypes[T]
  }
}

interface Label<T> {
  type: T
  value: TaggedViewTypes[T]
}

type Display = JSX.Element

interface View<T extends keyof ViewTypes> {
  (label: Label<T>, children: Display[]): Display
}

const viewChar: View<'char'> = label => {
  label.value
}

export const App = () => <></>

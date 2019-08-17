type State<T> = {
  value: T
  set(value: T): void
}

type Foo = {
  a: {
    b: number
    c: {
      d: string
    }
  }
  e: boolean
  extra: string
}

const Foo = (state: State<Foo>) => {}

let root: Foo = {
  a: {
    b: 0,
    c: {
      d: 'hi',
    },
  },
  e: true,
  extra: 'extra',
}

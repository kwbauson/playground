type Pattern<T> =
  | ((value: any) => value is T)
  | ((value: any) => boolean)
  | { [K in keyof T]: Pattern<T[K]> }
  | T

declare function chain(): Chain<undefined>
declare function chain<T>(defaultValue: T): Chain<T>

declare function exact<T>(pattern: Pattern<T>): (value: any) => value is T
declare function partial<T>(pattern: Pattern<T>): (value: any) => value is T

interface Chain<R> {
  exact<T, R2>(
    pattern: Pattern<T>,
    result: ((value: T) => R2) | R2,
  ): Chain<R | R2>
  partial<T2, R2>(pattern: Pattern<T2>, result: R2): Chain<R | R2>
  match(value: any): R
}

const result = chain()
  .exact(1, x => `${x}`)
  .exact(null, null)
  .exact(Array.isArray, ['test'])
  .match(2)

interface Extender<T> {
  extend<E>(f: (x: T) => E): Extender<T & E>
}

type NewMatcher = {
  exact<T, R>(pattern: Pattern<T>, f: (value: T) => R): Matcher<(value: T) => R>
}

type Matcher<M> = {
  exact<T, R>(
    pattern: Pattern<T>,
    f: (value: T) => R,
  ): Matcher<M & ((value: T) => R)>
  matcher(): M
}

declare function is<T>(value: any): value is T

declare function matcher(): NewMatcher

const foo = matcher()
  .exact(Array.isArray, () => 'array')
  .exact(true, () => null)
  .exact('test', () => 1)
  .matcher()

const bar = foo('foo')

import * as t from 'io-ts'

export const FailMatch = Symbol('FailMatch')

export function fail() {
  throw FailMatch
}

type Matcher<T = any, U = any> = (value: T, matchers: Matcher<T, U>[]) => U

export function matches<T = any, U = any>(
  matcher: Matcher<T, U>,
  value: T,
  matchers: Matcher<T, U>[],
): { matches: boolean; result?: U } {
  try {
    return { matches: true, result: matcher(value, matchers) }
  } catch (err) {
    if (err === FailMatch) {
      return { matches: false }
    } else {
      throw err
    }
  }
}

export function matchAll<T = any, U = any>(
  matchers: Matcher<T, U>[],
): (value: T) => U[] {
  return value => {
    return matchers
      .map(f => matches(f, value, matchers))
      .filter(x => x.matches)
      .map(x => x.result!)
  }
}

export const jsonView: Matcher<any, React.ReactNode>[] = [
]

type Path = { key: <K extends string>(key: K) => { [key]: Path } }


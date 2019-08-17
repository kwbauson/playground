type InitialRewriter = {
  rule<A, B>(fn: (value: A) => B): Rewriter<A, B>
}

type Rewriter<A, B> = {
  rule<T, U>(fn: (value: T) => U): Rewriter<A | T, B | U>
}

function rewriter(): InitialRewriter {
  return {} as any
}

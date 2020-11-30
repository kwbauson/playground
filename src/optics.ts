// https://github.com/ekmett/lens#lens-lenses-folds-and-traversals
const ViewerFn = Symbol()
const PrismFn = Symbol()
const LensFn = Symbol()
const IsoFn = Symbol()

type Fn<A extends unknown[], B> = (..._: A) => B

type Viewer<A, B> = {
  [ViewerFn]: Fn<[A], B>
  to<C>(other: Viewer<B, C>): Viewer<A, C>
  of<C>(other: Viewer<C, A>): Viewer<C, B>
}

type Prism<A, B> = {
  [PrismFn]: Fn<[B, A], null | { just: A }>
  to<C>(other: Prism<B, C>): Prism<A, C>
  of<C>(other: Prism<C, A>): Prism<C, B>
} & Viewer<A, B>

type Lens<A, B> = {
  [LensFn]: Fn<[B, A], A>
  to<C>(other: Lens<B, C>): Lens<A, C>
  of<C>(other: Lens<C, A>): Lens<C, B>
} & Viewer<A, B>

type Iso<A, B> = {
  [IsoFn]: Fn<[B], A>
  to<C>(other: Iso<B, C>): Iso<A, C>
  of<C>(other: Iso<C, A>): Iso<C, B>
} & Prism<A, B> &
  Lens<A, B>

type Store = {
  users: User[]
  todos: Todo[]
}

type User = {
  name: string
}

type Todo = {
  content: string
  done: boolean
}

// get /api/users -> [{ name: 'Keith' }]
// get /api/users/0 -> { name: 'Keith' }
// post /api/users { name: 'Andrew' }
// put /api/users/1 { name: 'Ben' }
// delete /api/users/1
type ApiRequest<T> = {
  url: string
  resolve: () => Promise<ApiResponse<T>>
}

type ApiResponse<T> = { success: T } | { error: string }

const apiRoot = '/api'

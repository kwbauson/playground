const GetterFn = Symbol()
const PrismFn = Symbol()
const LensFn = Symbol()
const IsoFn = Symbol()

type Fn<Args extends unknown[], Result> = (...args: Args) => Result

type Getter<A, B> = {
  [GetterFn]: Fn<[A], B>
  to<C>(other: Getter<B, C>): Getter<A, C>
  of<C>(other: Getter<C, A>): Getter<C, B>
}

type Prism<A, B> = {
  [PrismFn]: Fn<[B, A], null | { just: A }>
  to<C>(other: Prism<B, C>): Prism<A, C>
  of<C>(other: Prism<C, A>): Prism<C, B>
} & Getter<A, B>

type Lens<A, B> = {
  [LensFn]: Fn<[B, A], A>
  to<C>(other: Lens<B, C>): Lens<A, C>
  of<C>(other: Lens<C, A>): Lens<C, B>
} & Getter<A, B>

type Iso<A, B> = {
  [IsoFn]: Fn<[B], A>
  to<C>(other: Iso<B, C>): Iso<A, C>
  of<C>(other: Iso<C, A>): Iso<C, B>
} & Prism<A, B> &
  Lens<A, B>

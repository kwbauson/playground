export declare class Optic<S, A> {
  static identity: Optic<unknown, unknown>

  get: Fn<[S], A>
  put: Fn<[S, A], S>

  to<B>(get: Fn<[A], B>, put: Fn<[A, B], A>): Optic<S, B>
  to<B>(optical: Optical<A, B>): Optic<S, B>

  of<T>(get: Fn<[T], S>, put: Fn<[T, S], T>): Optic<T, A>
  of<T>(optical: Optical<T, S>): Optic<T, A>

  pick<KS extends (keyof A)[]>(keys: KS): Optic<S, Pick<A, KS[number]>>
  omit<KS extends (keyof A)[]>(keys: KS): Optic<S, Omit<A, KS[number]>>

  map<B>(optical: Optical<ValueType<A>, B>): Optic<S, B>
  at<K extends keyof A>(key: K): Optic<S, Maybe<A[K]>>

  build: { [K in keyof Choice<S>]: Optic<Choice<S>[K], A> }
  choice: { [K in keyof Choice<A>]: Optic<S, Maybe<Choice<A>[K]>> }
}

export type Optical<S, A> =
  | Optic<S, A>
  | Exclude<A, object | Function | Optic<any, any>>
  | ((attrs: { [K in keyof A]: Optic<S, A[K]> }) => Optical<S, A>)
  | { [K in keyof Record<A>]: Optical<S, Record<A>[K]> }
  | NotEmpty<{ [K in keyof Choice<S>]: Optical<Choice<S>[K], A> }>

export declare function optic<S>(): Optic<S, S>

export type Record<T> = keyof T extends never
  ? never
  : Exclude<Extract<T, object>, Function>
export type Choice<T> = Intersect<T extends any ? Single<T> : never>
type Single<T> = ChoiceType<T> extends never
  ? Intersect<keyof T> extends never
    ? never
    : T
  : {} extends T
  ? never
  : { [K in ChoiceType<T>]: undefined }
type ChoiceType<T> = string extends T
  ? never
  : number extends T
  ? never
  : symbol extends T
  ? never
  : T extends keyof any
  ? T
  : T extends true
  ? 'true'
  : T extends false
  ? 'false'
  : never

export type NotEmpty<T> = {} extends T ? never : T
export type Fn<Args extends unknown[], Result> = (...args: Args) => Result
export type Maybe<T> = 'nothing' | { just: T }
export type Intersect<T> = (T extends any ? Fn<[T], void> : never) extends Fn<
  [infer I],
  void
>
  ? [unknown] extends [I]
    ? never
    : I
  : never
export type ValueOf<T> = T[keyof T]
export type ValueType<T> = [T] extends [(infer U)[]]
  ? U
  : [T] extends [{ [_ in any]: infer U }]
  ? U
  : never
export type Diff<T, U> = IfEq<keyof T, keyof U, {}, Omit<T, keyof U>>
export type Common<T, U> = Pick<T, Extract<keyof T, keyof U>>
type IfEq<T, U, A, B> = [T] extends [U] ? ([U] extends [T] ? A : B) : B

export type VNode =
  | { Div: VNode[] }
  | { Text: string }
  | { Input: string }
  | { NumberInput: number }
  | { Button: { label: string; clicked: boolean } }
  | 'Break'
  | 'Divider'

export function optic<S>(): Optic<S, S> {
  return { build: {} } as any
}

export const {
  Div,
  Text,
  Input,
  NumberInput,
  Button,
  Break,
  Divider,
} = optic<VNode>().build

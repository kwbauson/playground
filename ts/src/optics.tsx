type Iso<S, A> = Optic<'iso', S, A>
type Lens<S, A> = Optic<'lens', S, A>
type Getter<S, A> = Optic<'getter', S, A>
type Prism<S, A> = Optic<'prism', S, A>
type Traversal<S, A> = Optic<'traversal', S, A>
type Setter<S, A> = Optic<'setter', S, A>
type Fold<S, A> = Optic<'fold', S, A>

type OpticFns<S, A> = Partial<Optic<any, S, A>>
type LensFn<S, A> = NonNullable<OpticFns<S, A>['lensFn']>
type Kind<K, L, T> = L extends K ? T : undefined

class Optic<K, S, A> {
  static identity = Optic.lens(x => [x, () => x])

  static id<S>(): Lens<S, S> {
    return Optic.identity as Lens<S, S>
  }

  static iso<S, A>(sa: (_: S) => A, as: (_: A) => S): Iso<S, A> {
    return new Optic('iso', {
      lensFn: s => [sa(s), as],
    })
  }

  static lens<S, A>(lensFn: LensFn<S, A>): Lens<S, A> {
    return new Optic('lens', {
      lensFn: s => {
        const [a, as] = lensFn(s)
        return [a, a2 => (a2 === a ? s : as(a2))]
      },
    })
  }

  lensFn: (_: S) => [A, (_: A) => S]

  to: Apply<S, A> = function<B>(
    this: CombineThis<S, A>,
    ...args: CombineArgs<S, A, A, B>
  ): CombineReturn<S, B> {
    return Optic.lens(s => {
      const [a, as] = this.lensFn(s)
      const [b, ba] = this.fromCombineArgs(args).lensFn(a)
      return [b, b2 => as(ba(b2))]
    })
  }

  toLens<B>(this: Lens<S, A>, lensFn: LensFn<A, B>): Lens<S, B> {
    return this.to(Optic.lens(lensFn))
  }

  of: Compose<S, A> = function<B>(
    this: CombineThis<S, A>,
    ...args: CombineArgs<S, A, B, S>
  ): CombineReturn<B, A> {
    return this.fromCombineArgs(args).to(this)
  }

  entries!: { [E in keyof A]: Lens<S, A[E]> }

  private constructor(public kind: K, fns: Partial<OpticFns<S, A>>) {
    this.lensFn = fns.lensFn!
  }

  private fromCombineArgs<T, B>(
    this: CombineThis<S, A>,
    args: CombineArgs<S, A, T, B>,
  ) {
    if (args[0] instanceof Optic) {
      const [optic] = args
      return optic
    } else {
      const [fn] = args
      return fn(this)
    }
  }
}

type Apply<S, A> = {
  <B>(this: Lens<S, A>, lens: Lens<A, B>): Lens<S, B>
  <B>(this: Lens<S, A>, fn: (self: Lens<S, A>) => Lens<A, B>): Lens<S, B>
}
type Compose<S, A> = {
  <B>(this: Lens<S, A>, lens: Lens<B, S>): Lens<B, A>
  <B>(this: Lens<S, A>, fn: (self: Lens<S, A>) => Lens<B, S>): Lens<B, A>
}

type CombineThis<S, A> = Lens<S, A>
type CombineArgs<S, A, T, B> = [Lens<T, B>] | [(self: Lens<S, A>) => Lens<T, B>]
type CombineReturn<S, A> = Lens<S, A>

type User = {
  firstName: string
  lastName: string
  maritalStatus: MaritalStatus
}

type MaritalStatus = 'single' | 'married'

declare const Div: Lens<Node[], Node>
declare const TextInput: Lens<string, Node>
declare const Checkbox: Lens<boolean, Node>
declare const choice: <S, A>(lenes: Lens<S, A>[]) => Lens<S, A[]>

const id = Optic.id

const user = id<User>()
const single = id<MaritalStatus>().toLens(s => [
  s === 'single',
  (b: boolean) => (b ? 'single' : 'married'),
])

const User = user.to(({ entries: { firstName, lastName, maritalStatus } }) =>
  Div.of(
    choice([
      TextInput.of(firstName),
      TextInput.of(lastName),
      Checkbox.of(single.of(maritalStatus)),
    ]),
  ),
)

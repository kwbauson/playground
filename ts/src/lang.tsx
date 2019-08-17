import React, { Fragment } from 'react'

type Lang =
  | { union: Lang[] }
  | { concat: Lang[] }
  | { bind: string; lang: Lang }
  | { quot: Lang; lang: Lang }
  | { ref: string }
  | string

const Union = (...union: Lang[]): Lang => ({ union })
const Concat = (...concat: Lang[]): Lang => ({ concat })
const Quot = (quot: Lang, lang: Lang): Lang => ({ quot, lang })
const Bind = (bind: string, lang: Lang): Lang => ({ bind, lang })
const BindAnd = (bind: string, lang: Lang): Lang =>
  Concat(Bind(bind, lang), Ref(bind))
const RootQuot = (lang: Lang) => Quot(Ref('[]'), lang)
const Ref = (ref: string): Lang => ({ ref })

export const rootLang: Lang = BindAnd(
  '[]',
  Union(
    Concat('Type', 'Bool'),
    Concat('Bool', Union('True', 'False')),
    Concat('Type', 'Nat'),
    Concat('Nat', Union('Z', Concat('S', RootQuot('Nat')))),
    Concat(
      'plus',
      BindAnd('a', RootQuot('Nat')),
      Union(
        Concat('Z', Ref('a')),
        Concat(
          'S',
          BindAnd('b', RootQuot('Nat')),
          'S',
          RootQuot(Concat('plus', Ref('a'), Ref('b'))),
        ),
      ),
    ),
    Concat(
      'minus',
      RootQuot(
        Concat(
          'plus',
          BindAnd('a', RootQuot('Nat')),
          BindAnd('b', RootQuot('Nat')),
        ),
      ),
      Ref('a'),
      Ref('b'),
    ),
    Concat(
      Bind('A', RootQuot('Type')),
      Union(
        Concat('Type', 'Maybe', 'A'),
        Concat('Maybe', 'A', Union('Nothing', Concat('Just', RootQuot('A')))),
      ),
    ),
  ),
)

function ViewLang(lang: Lang): React.ReactNode {
  if (typeof lang === 'string') {
    return <code>{lang}</code>
  } else if ('union' in lang) {
    return lang.union.map((l, i) => (
      <Fragment key={i}>{[i !== 0 && <hr />, ViewLang(l)]}</Fragment>
    ))
  } else if ('concat' in lang) {
    return lang.concat.map((l, i) => (
      <Fragment key={i}>{[i !== 0 && <>&nbsp;</>, ViewLang(l)]}</Fragment>
    ))
  } else if ('bind' in lang) {
    return (
      <>
        <code>{lang.bind}@</code>
        {ViewLang(lang.lang)}
      </>
    )
  } else if ('quot' in lang) {
    return (
      <div>
        {ViewLang(lang.quot)}
        QUOT
        {ViewLang(lang.lang)}
      </div>
    )
  } else if ('ref' in lang) {
    return <code>${lang.ref}</code>
  } else {
    return 'TODO'
  }
}

export const App = () => {
  return ViewLang(rootLang)
}

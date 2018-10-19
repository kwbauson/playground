import React from 'react'

type Lang =
  | { type: 'union'; left: Lang; right: Lang }
  | { type: 'empty' }
  | { type: 'concat'; left: Lang; right: Lang }
  | { type: 'word'; word: string }
  | { type: 'quot'; left: Lang; right: Lang }
  | { type: 'bind'; id: string; lang: Lang }
  | { type: 'var'; id: string }

type Env = { lang: Lang; bindings: { [id: string]: Lang } }

type Result =
  | { type: 'result'; env: Env }
  | { type: 'error'; message: string; env: Env }

const Union = (...langs: [Lang, ...Lang[]]): Lang =>
  langs.reduceRight((right, left) => ({ type: 'union', left, right }))
const Concat = (...langs: [Lang, Lang, ...Lang[]]): Lang =>
  langs.reduceRight((right, left) => ({ type: 'concat', left, right }))
const Word = (word: string): Lang => ({ type: 'word', word })
const Bind = (id: string, lang: Lang): Lang => ({ type: 'bind', id, lang })
const Quot = (left: Lang, right: Lang): Lang => ({ type: 'quot', left, right })
const Var = (id: string): Lang => ({ type: 'var', id })
const fromRoot = (lang: Lang): Lang => Quot(Var('[]'), lang)

function fromMatrix(matrix: (string | Lang)[][]): Lang {
  const langs = matrix.map(fromLine)
  if (langs.length === 0) {
    return { type: 'empty' }
  } else if (langs.length === 1) {
    const [item] = langs
    return item
  } else {
    const [first, second, ...rest] = langs
    return Union(first, second, ...rest)
  }
}

function fromLine(line: (string | Lang)[]): Lang {
  const langs = line.map(x => (typeof x === 'string' ? Word(x) : x))
  if (langs.length === 0) {
    return { type: 'empty' }
  } else if (langs.length === 1) {
    const [item] = langs
    return item
  } else {
    const [first, second, ...rest] = langs
    return Concat(first, second, ...rest)
  }
}

function result(env: Env): Result
function result(bindings: Env['bindings'], lang: Lang): Result
function result(...args: any[]): Result {
  if (args.length === 1) {
    const [env] = args
    return { type: 'result', env }
  } else {
    const [bindings, lang] = args
    return { type: 'result', env: { bindings, lang } }
  }
}

const error = (message: string, env: Env): Result => ({
  type: 'error',
  message,
  env,
})

const makeRoot = (root: Lang): Lang => Concat(Bind('[]', root), Var('[]'))

function hasVar(id: string, lang: Lang): boolean {
  switch (lang.type) {
    case 'empty':
    case 'word':
      return false
    case 'var':
      return id === lang.id
    case 'bind':
      return hasVar(id, lang.lang) // TODO shadowing
    case 'concat':
    case 'union':
    case 'quot':
      return hasVar(id, lang.left) || hasVar(id, lang.right)
  }
}

function canStep(lang: Lang): boolean {
  switch (lang.type) {
    case 'union':
    case 'quot':
    case 'bind':
    case 'var':
      return true
    case 'concat':
    case 'empty':
    case 'word':
      return false
  }
}

function step(env: Env): Result {
  const { bindings, lang } = env
  const notImplimented = error('not implimented', env)
  switch (lang.type) {
    case 'union':
    case 'empty':
    case 'word':
    case 'bind':
      return result(env)
    case 'var':
      if (lang.id in bindings) {
        const { [lang.id]: newLang, ...newBindings } = bindings
        if (hasVar(lang.id, newLang)) {
          return result(bindings, newLang)
        } else {
          return result(newBindings, newLang)
        }
      } else {
        return error(`variable not found: ${lang.id}`, env)
      }
    case 'concat':
      const { left, right } = lang
      switch (left.type) {
        case 'bind':
          return result({ ...bindings, [left.id]: left.lang }, right)
        default:
          return notImplimented
      }
    case 'quot':
      return notImplimented
  }
}

function stepN(env: Env, count: number): Result {
  if (count === 0) {
    return result(env)
  } else {
    const result = step(env)
    if (result.type === 'result') {
      return stepN(result.env, count - 1)
    } else {
      return result
    }
  }
}

const rootResult = stepN(
  {
    lang: makeRoot(
      fromMatrix([
        ['Type', 'Bool'],
        ['Bool', fromMatrix([['True'], ['False']])],
        ['Type', 'Nat'],
        ['Nat', fromMatrix([['Z'], ['S', fromRoot(Word('Nat'))]])],
        [
          Bind('A', fromRoot(Word('Type'))),
          fromMatrix([
            ['Type', 'Maybe', Var('A')],
            ['Maybe', fromMatrix([['Nothing'], ['Just']])],
          ]),
        ],
        [
          Bind('a', fromRoot(Word('Nat'))),
          Bind('b', fromRoot(Word('Nat'))),
          'plus',
          'a',
          fromMatrix([
            ['Z', Var('a')],
            [
              'S',
              Var('b'),
              'S',
              fromRoot(fromMatrix([['plus', Var('a'), Var('b')]])),
            ],
          ]),
        ],
      ]),
    ),
    bindings: {},
  },
  2,
)

export const App = () => (
  <div>
    <div>
      <ResultView result={rootResult} />
    </div>
    <hr />
    <pre>{JSON.stringify(rootResult.env.lang, null, 2)}</pre>
  </div>
)

const ResultView: React.ComponentType<{ result: Result }> = ({ result }) => (
  <div>
    {result.type === 'error' && <div>{result.message}</div>}
    <EnvView env={result.env} />
  </div>
)

const EnvView: React.ComponentType<{ env: Env }> = ({
  env: { bindings, lang },
}) => (
  <div>
    <LangView lang={lang} />
    <hr />
    <span>{JSON.stringify(Object.keys(bindings))}</span>
  </div>
)

const LangView: React.ComponentType<{ lang: Lang }> = ({ lang }) => {
  switch (lang.type) {
    case 'empty':
      return <code>()</code>
    case 'word':
      return <code>{lang.word}</code>
    case 'var':
      return <code>{lang.id}</code>
    case 'bind':
      return lang.lang.type === 'quot' &&
        lang.lang.left.type === 'var' &&
        lang.lang.left.id === '[]' ? (
        <span>
          <code>{lang.id}@</code>
          <LangView lang={lang.lang} />
        </span>
      ) : (
        <span>
          <code>
            {lang.id}
            @(
          </code>
          <LangView lang={lang.lang} />
          <code>)</code>
        </span>
      )
    case 'concat':
      return lang.right.type === 'union' ? (
        <span>
          <LangView lang={lang.left} />
          <div style={{ paddingLeft: 20 }}>
            <LangView lang={lang.right} />
          </div>
        </span>
      ) : (
        <span>
          <LangView lang={lang.left} /> <LangView lang={lang.right} />
        </span>
      )
    case 'union':
      return (
        <span>
          <div>
            <LangView lang={lang.left} />
          </div>
          <div>
            <LangView lang={lang.right} />
          </div>
        </span>
      )
    case 'quot':
      if (lang.left.type === 'var' && lang.left.id) {
        return (
          <span>
            <code>[</code>
            <LangView lang={lang.right} />
            <code>]</code>
          </span>
        )
      } else {
        return (
          <span>
            <code>(</code>
            <LangView lang={lang.left} />
            <code> ~ </code>
            <LangView lang={lang.right} />
            <code>)</code>
          </span>
        )
      }
  }
}

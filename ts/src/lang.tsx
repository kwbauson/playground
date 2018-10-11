type Lang =
  | { type: 'union'; left: Lang; right: Lang }
  | { type: 'empty' }
  | { type: 'concat'; left: Lang; right: Lang }
  | { type: 'word'; word: string }
  | { type: 'quot'; left: Lang; right: Lang }
  | { type: 'bind'; id: string; lang: Lang }
  | { type: 'var'; id: string }

type Env = { bindings: { [id: string]: Lang }; lang: Lang }

type Result =
  | { type: 'result'; env: Env }
  | { type: 'error'; message: string; env: Env }

const Union = (...langs: [Lang, Lang, ...Lang[]]): Lang =>
  langs.reduceRight((left, right) => ({ type: 'union', left, right }))
const Concat = (...langs: [Lang, Lang, ...Lang[]]): Lang =>
  langs.reduceRight((left, right) => ({ type: 'concat', left, right }))
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
        return result(newBindings, newLang)
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

const testRoot: Env = {
  bindings: {},
  lang: makeRoot(
    fromMatrix([
      ['Type', 'Bool'],
      ['Bool', fromMatrix([['True'], ['False']])],
      ['Type', 'Nat'],
      ['Nat', fromMatrix([['Z'], ['S', fromRoot(Word('Nat'))]])],
      // ['Nat', Union(Word('Z'), Concat(Word('S'), fromRoot(Word('Nat'))))],
    ]),
  ),
}

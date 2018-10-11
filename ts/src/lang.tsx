type Lang =
  | { type: 'union'; left: Lang; right: Lang }
  | { type: 'empty' }
  | { type: 'concat'; left: Lang; right: Lang }
  | { type: 'null' }
  | { type: 'word'; word: string }
  | { type: 'quot'; left: Lang; right: Lang }
  | { type: 'bind'; id: string; lang: Lang }
  | { type: 'var'; id: string }

type Env = { bindings: { [id: string]: Lang }; lang: Lang }

type Result =
  | { type: 'result'; env: Env }
  | { type: 'error'; message: string; env: Env }

function makeRoot(root: Lang): Lang {
  return {
    type: 'concat',
    left: { type: 'bind', id: '[]', lang: root },
    right: { type: 'var', id: '[]' },
  }
}

function step(env: Env): Result {
  const { bindings, lang } = env
  switch (lang.type) {
    default:
      return { type: 'error', message: 'not implimented', env }
  }
}

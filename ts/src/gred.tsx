type AST<S extends keyof G, G extends Grammar<G>> = {
  type: S
  value: G[S]['value']
  children: { [K in keyof G[S]['children']]: AST<G[S]['children'][any], G> }
}

type Grammar<G extends Grammar<G>> = {
  [T in keyof G]: {
    value?: any
    children: (keyof G)[]
  }
}

interface TextGrammar
  extends Grammar<{
      text: { children: 'paragraph'[] }
      paragraph: { children: 'line'[] }
      line: { children: 'char'[] }
      char: { value: string; children: [] }
    }> {}

interface TextAST extends AST<'text', TextGrammar> {}

/*

gred foo.txt mode text 

*/

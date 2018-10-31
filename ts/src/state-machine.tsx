type State = {
  type: Type
  value: any
  transitions: Transition[]
}

type Type = (string | { var: string })[]

type Transition = {}

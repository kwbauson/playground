import React, { useState } from 'react'

type State = {
  players: Player[]
  tiles: Tile[]
}

type Player = {
  hand: Tile[]
  stock: { [K in Stock]: number }
  money: number
}

type Tile = {
  letter: string
  number: number
}

type Stock = 'echo' | 'bolt' | 'fleet' | 'etch' | 'rove' | 'nestor' | 'spark'

const initialPlayer: Player = {
  hand: [],
  money: 6000,
  stock: {
    echo: 0,
    bolt: 0,
    fleet: 0,
    etch: 0,
    rove: 0,
    nestor: 0,
    spark: 0,
  },
}

export const Game = () => {
  const [state, setState] = useState<State>({
    players: [],
    tiles: [],
  })
  return <div>foo</div>
}

import React, { StatelessComponent as FSC } from 'react'
import { types } from 'mobx-state-tree'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

const CounterStore = types.model({ count: 0 }).actions(self => ({
  increment: (amount = 0) => (self.count += amount),
  decrement: (amount = 0) => (self.count -= amount),
}))

export const App = () => <Counter />

export const store = observable({ count: 0 })

const Counter = observer(() => (
  <div>
    <button onClick={() => (store.count -= 1)}>-</button>
    {store.count}
    <button onClick={() => (store.count += 1)}>+</button>
    <br />
    foobar
  </div>
))

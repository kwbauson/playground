import React from 'react'
import { createView, is, cast, exact, partial } from './vtree'

export const App = () =>
  createView()
    .match({ $ref: is(String) }, ({ value: { $ref }, merge }) => (
      <a
        href={$ref}
        onClick={e => {
          e.preventDefault()
          merge({ load: true })
        }}
      />
    ))
    .match(
      { $ref: is(String), load: true },
      async ({ value: { $ref }, set }) => {
        set({ $ref, loading: true })
        const response = await fetch($ref)
        const json = await response.json()
        set(json)
      },
    )
    .match({ $ref: is(String), loading: true }, <span>loading...</span>)
    .start({ $ref: 'https://swapi.co/api/' })

// FIXME loading is type {}

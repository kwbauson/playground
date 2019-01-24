import React from 'react'
import { View, any, is } from './vtree'
import _ from 'lodash'

function isUrl(value: any): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('http://') || value.startsWith('https://'))
  )
}

function isImageUrl(value: any): value is string {
  return isUrl(value) && !!value.match(/\.(jpe?g|gif|png)$/)
}

export const App = View.create()
  .match(any, ({ value, children }) => {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      return <code>{JSON.stringify(value)}</code>
    } else if (Array.isArray(value) || _.isPlainObject(value)) {
      const isArray = Array.isArray(value)
      const entries = Object.entries(children)
      const opening = isArray ? '[' : '{'
      const closing = isArray ? ']' : '}'
      return (
        <>
          <code>{opening}</code>
          {entries.map(([key, val], i) => (
            <div key={key} style={{ paddingLeft: 16 }}>
              <code>{isArray ? i : JSON.stringify(key)}:&nbsp;</code>
              {val.render()}
              {i !== entries.length - 1 && <code>,</code>}
            </div>
          ))}
          <code>{closing}</code>
        </>
      )
    } else {
      return (
        <b>
          <i>UNHANDLED</i>
        </b>
      )
    }
  })
  .match(isUrl, ({ value: url, set }) => (
    <a
      href={url}
      onClick={e => {
        e.preventDefault()
        set({ load: url })
      }}
    >
      {url}
    </a>
  ))
  .match(isImageUrl, ({ value }) => (
    <img src={value} style={{ maxWidth: 500 }} />
  ))
  .match({ load: isUrl }, async ({ value: { load: url }, set }) => {
    set({ loading: url })
    const response = await fetch(url)
    const json = await response.json()
    set({ loaded: json, url })
  })
  .match({ loaded: any, url: isUrl }, ({ value: { url }, set, children }) => (
    <>
      <button onClick={() => set({ load: url })}>reload</button>
      <button onClick={() => set(url)}>unload</button>
      {children.loaded.render()}
    </>
  ))
  .matchKey('click_to_change_root', ({ root, key, self }) => (
    <button
      onClick={() => {
        root.children.random_number.set(Math.random())
      }}
    >
      {key}
    </button>
  ))
  .match(
    { tabs: any, selected: is(String) },
    ({ children: { tabs, selected } }) => (
      <>
        <div>
          {Object.keys(tabs.value).map(key => (
            <button key={key} onClick={() => selected.set(key)}>
              {key}
            </button>
          ))}
        </div>
        {tabs.children[selected.value].render()}
      </>
    ),
  )
  .match({ counter: is(Number) }, ({ children: { counter } }) => (
    <>
      <button onClick={() => counter.set(x => x - 1)}>-</button>
      {counter.value}
      <button onClick={() => counter.set(x => x + 1)}>+</button>
    </>
  ))
  .matchKey('text_box', ({ value, set }) => (
    <input value={value} onChange={e => set(e.target.value)} />
  ))
  .matchKey('random_number', ({ value, set }) => (
    <input value={value} onChange={e => set(e.target.value)} />
  ))
  .component({
    apis: {
      selected: 'swapi',
      tabs: {
        info:
          'see https://github.com/toddmotto/public-apis for a large list of public apis',
        swapi: 'https://swapi.co/api/',
        pokeapi: 'https://pokeapi.co/api/v2/',
        schemastore: 'http://schemastore.org/api/json/catalog.json',
        dogapi_random: 'https://dog.ceo/api/breeds/image/random',
        chucknorris_random: 'http://api.icndb.com/jokes/random?exclude=[nerdy]',
        meow: 'https://aws.random.cat/meow',
        shlaapi: {
          characters: 'https://rickandmortyapi.com/api/character',
          episodes: 'https://rickandmortyapi.com/api/episode',
          locations: 'https://rickandmortyapi.com/api/location',
        },
      },
    },
    test: { edit_data: null, input: 'null', isString: false },
    this: {
      is: {
        a: {
          deeply: {
            nested: {
              object: {
                that: {
                  changes: {
                    root: {
                      click_to_change_root: null,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    counter: { counter: 0 },
    random_number: 0,
    text_box: 'type here',
  })

// FIXME loading is type {}

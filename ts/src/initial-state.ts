export = {
  apis: {
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
  drag_me: {
    dragging: false,
    width: 100,
    height: 100,
    x: 100,
    y: 500,
    xOff: 0,
    yOff: 0,
    clicked: false,
  },
}

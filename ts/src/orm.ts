const schema = {
  user: {
    firstName: 'string',
    lastName: 'string',
  },
  role: {
    name: 'string',
  },
  permission: {
    name: 'string',
  },
  relationships: [],
} as const

type Types<T> = 'boolean' | 'number' | 'string' | keyof T

type Model<T> = {}

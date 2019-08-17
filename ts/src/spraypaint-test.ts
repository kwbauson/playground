import { Model, Attr, SpraypaintBase } from 'spraypaint'

@Model()
export class ApplicationRecord extends SpraypaintBase {
  static baseUrl = 'http://localhost:3000'
  static apiNamespace = '/api/v1'
}

@Model()
export class Person extends ApplicationRecord {
  @Attr() firstName!: string
  @Attr() lastName!: string
}

export async function main() {
  const scope = Person.order({ firstName: 'desc' })
  const result = await scope.where({ firstName: 'hi' }).all()
  return result
}

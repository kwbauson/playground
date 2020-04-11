import jscodeshift from 'jscodeshift'

export const parser = 'flow'

export default (file: jscodeshift.FileInfo, api: jscodeshift.API) => {
  const j = api.jscodeshift
  const root = j(file.source)
  const paths = root.find(j.IntersectionTypeAnnotation)
  paths.forEach(path => {
    const types = path.node.types.flatMap(x =>
      x.type === 'ObjectTypeAnnotation'
        ? x.properties
        : [j.objectTypeSpreadProperty(x)],
    )
    const newType = j.objectTypeAnnotation(types)
    path.replace(newType)
  })
  return root.toSource()
}

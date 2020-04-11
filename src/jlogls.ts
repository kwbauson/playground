import {
  createConnection,
  Diagnostic,
  Range,
  Position,
  DiagnosticSeverity,
  ProposedFeatures,
} from 'vscode-languageserver'
import * as fs from 'fs'

const jlogdir = '/tmp/jlogls'

type JLog = {
  name: string
  entries: JLogEntry[]
}

type JLogEntry = {
  file: string
  line: number
  column?: number
  message: string
  severity?: 'error' | 'warning'
}

async function getJLogFiles(): Promise<string[]> {
  let fileNames: string[] = []
  try {
    fileNames = await fs.promises.readdir(jlogdir)
  } catch {
    fs.promises.mkdir(jlogdir)
  }
  return fileNames
}

async function getJLogs(fileNames: string[]): Promise<JLog[]> {
  return await Promise.all<JLog>(
    fileNames.map(async fileName => {
      const name = fileName.slice(0, fileName.length - '.json'.length)
      let entries: JLogEntry[] = []
      try {
        const buffer = await fs.promises.readFile(`${jlogdir}/${fileName}`)
        entries = JSON.parse(buffer.toString())
      } catch {}
      return { name, entries }
    }),
  )
}

function samePosition(a: Position, b: Position): boolean {
  return a.line === b.line && a.character === b.character
}

function sameRange(a: Range, b: Range): boolean {
  return samePosition(a.start, b.start) && samePosition(a.end, b.end)
}

function sameDiagnostic(a: Diagnostic, b: Diagnostic): boolean {
  return (
    sameRange(a.range, b.range) &&
    // a.message === b.message &&
    a.severity === b.severity &&
    a.source === b.source &&
    a.code === b.code &&
    a.relatedInformation === b.relatedInformation
  )
}

function getDiagnostic(jlogName: string, entry: JLogEntry): Diagnostic {
  const { line: realLine, column = 1, message } = entry
  const line = realLine - 1
  const severity =
    entry.severity == 'warning'
      ? DiagnosticSeverity.Warning
      : DiagnosticSeverity.Error
  return {
    range: {
      start: { line, character: column - 1 },
      end: { line, character: Number.MAX_SAFE_INTEGER },
    },
    message,
    severity,
    source: jlogName,
  }
}

const connection = createConnection(ProposedFeatures.all)
const diagnosticMap = new Map<string, Diagnostic[]>()

async function sendDiagnostics(jlogFiles: string[]): Promise<void> {
  const logs = await getJLogs(jlogFiles)
  for (const log of logs) {
    for (const [uri, diagnostics] of diagnosticMap) {
      diagnosticMap.set(uri, diagnostics.filter(x => x.source !== log.name))
    }
    for (const entry of log.entries) {
      const diagnostic = getDiagnostic(log.name, entry)
      const uri = `file://${entry.file}`
      const existing = diagnosticMap.get(uri)
      if (existing) {
        if (!existing.some(x => sameDiagnostic(diagnostic, x))) {
          existing.push(diagnostic)
        }
      } else {
        diagnosticMap.set(uri, [diagnostic])
      }
    }
  }
  for (const [uri, diagnostics] of diagnosticMap) {
    connection.sendDiagnostics({ uri, diagnostics })
    if (diagnostics.length === 0) {
      diagnosticMap.delete(uri)
    }
  }
}

connection.onInitialized(async () => {
  sendDiagnostics(await getJLogFiles())
  fs.watch(jlogdir, { recursive: true }, async (_event, fileName) => {
    if (fileName) {
      sendDiagnostics([fileName])
    } else {
      sendDiagnostics(await getJLogFiles())
    }
  })
})

connection.listen()

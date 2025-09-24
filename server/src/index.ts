import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { nanoid } from 'nanoid'
import Bottleneck from 'bottleneck'
import { OpenAI } from 'openai'
import fs from 'fs'
import path from 'path'

export type Phase = 'idle' | 'analyzing' | 'decomposing' | 'researching' | 'aggregating' | 'synthesizing' | 'completed' | 'error'
export type SubQueryStatus = 'queued' | 'active' | 'completed' | 'failed'

export type SubQuery = {
  id: string
  text: string
  status: SubQueryStatus
  progress: number
  sources: number
  confidence?: number
  snippet?: string
  startedAt?: number
  endedAt?: number
  error?: string
}

export type ParallelResult = {
  reasoning: string
  answer: string
  citations: Array<{ title?: string; url: string; published?: string; author?: string }>
  confidence_score: number
}

export type Session = {
  id: string
  query: string
  phase: Phase
  createdAt: number
  subqueries: SubQuery[]
  results: Record<string, ParallelResult>
  activity: { t: number; msg: string }[]
  paused: boolean
}

const PORT = Number(process.env.PORT || 8787)
const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const sessions = new Map<string, Session>()
const sseClients = new Map<string, Set<express.Response>>()

const dataDir = path.join(process.cwd(), 'data', 'sessions')
fs.mkdirSync(dataDir, { recursive: true })

const parallel = new OpenAI({ baseURL: 'https://api.parallel.ai', apiKey: process.env.PARALLEL_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PARALLEL_RPM = Number(process.env.PARALLEL_RPM || 30)
const minTime = Math.ceil(60000 / Math.max(1, PARALLEL_RPM))
const limiter = new Bottleneck({
  minTime,
  maxConcurrent: 5,
  reservoir: PARALLEL_RPM,
  reservoirRefreshAmount: PARALLEL_RPM,
  reservoirRefreshInterval: 60_000
})

function emit(sessionId: string, payload: any) {
  const set = sseClients.get(sessionId)
  if (!set) return
  const data = `data: ${JSON.stringify(payload)}\n\n`
  for (const res of set) res.write(data)
}

function log(session: Session, msg: string) {
  session.activity.unshift({ t: Date.now(), msg })
  emit(session.id, { type: 'activity', message: msg })
}

function setPhase(session: Session, phase: Phase) {
  session.phase = phase
  emit(session.id, { type: 'status', phase })
}

function setOverall(session: Session) {
  const total = session.subqueries.reduce((a, b) => a + b.progress, 0)
  const percent = Math.floor(total / Math.max(1, session.subqueries.length))
  emit(session.id, { type: 'overall_progress', percent })
}

function generateSubqueries(query: string, count: number): SubQuery[] {
  const seeds = [
    'Direct factual answer',
    'Context/background essentials',
    'Comparative analysis of perspectives',
    'Recent developments and news',
    'Expert insights and opinions',
    'Industry-specific implications',
    'Historical context and timeline',
    'Future outlook and predictions',
    'Validation and fact-checking',
    'Related adjacent topics'
  ]
  return seeds.slice(0, count).map((s) => ({
    id: nanoid(10),
    text: `${s}: ${query}`,
    status: 'queued' as const,
    progress: 0,
    sources: 0
  }))
}

function complexityScore(query: string) {
  const factors = [
    /\bcompare|vs\b/i.test(query) ? 0.2 : 0,
    /\btrend|latest|recent\b/i.test(query) ? 0.2 : 0,
    /\bhistory|historical|timeline\b/i.test(query) ? 0.15 : 0,
    /\bforecast|future|prediction\b/i.test(query) ? 0.15 : 0,
    /\bexpert|opinion|insight\b/i.test(query) ? 0.15 : 0,
    query.split(/[,:;!?]/).length > 2 ? 0.15 : 0
  ]
  return Math.min(1, 0.3 + factors.reduce((a, b) => a + b, 0))
}

function desiredSubqueryCount(score: number) {
  return Math.min(10, Math.max(5, Math.round(5 + score * 5)))
}

app.get('/api/stream/:id', (req, res) => {
  const { id } = req.params
  if (!sessions.has(id)) return res.status(404).end()
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.write('\n')
  let set = sseClients.get(id)
  if (!set) {
    set = new Set()
    sseClients.set(id, set)
  }
  set.add(res)
  req.on('close', () => {
    set?.delete(res)
  })
})

app.post('/api/research', async (req, res) => {
  const { query } = req.body as { query?: string }
  if (!query || !query.trim()) return res.status(400).json({ error: 'Missing query' })

  const id = nanoid(12)
  const score = complexityScore(query)
  const count = desiredSubqueryCount(score)
  const subqueries = generateSubqueries(query, count)
  const session: Session = {
    id,
    query,
    phase: 'analyzing',
    createdAt: Date.now(),
    subqueries,
    results: {},
    activity: [],
    paused: false
  }
  sessions.set(id, session)

  setImmediate(() => orchestrate(session).catch((e) => { console.error(e) }))

  res.json({ sessionId: id, subqueries: count, complexity: score })
})

app.post('/api/session/:id/pause', (req, res) => {
  const s = sessions.get(req.params.id)
  if (!s) return res.status(404).json({ error: 'Not found' })
  s.paused = true
  log(s, 'Session paused')
  res.json({ ok: true })
})

app.post('/api/session/:id/resume', (req, res) => {
  const s = sessions.get(req.params.id)
  if (!s) return res.status(404).json({ error: 'Not found' })
  s.paused = false
  log(s, 'Session resumed')
  res.json({ ok: true })
})

app.get('/api/history', (req, res) => {
  const list = Array.from(sessions.values()).map((s) => ({
    id: s.id,
    query: s.query,
    createdAt: s.createdAt,
    phase: s.phase,
    subqueries: s.subqueries.length
  }))
  res.json({ sessions: list })
})

app.get('/api/session/:id/export.json', (req, res) => {
  const s = sessions.get(req.params.id)
  if (!s) return res.status(404).json({ error: 'Not found' })
  res.json({
    id: s.id,
    query: s.query,
    createdAt: s.createdAt,
    phase: s.phase,
    subqueries: s.subqueries,
    results: s.results,
    activity: s.activity
  })
})

app.get('/api/session/:id/export.md', (req, res) => {
  const s = sessions.get(req.params.id)
  if (!s) return res.status(404).send('Not found')
  const md = buildMarkdownReport(s)
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.send(md)
})

async function orchestrate(session: Session) {
  try {
    setPhase(session, 'analyzing')
    log(session, 'Analyzing query complexity...')

    await sleep(400)

    setPhase(session, 'decomposing')
    emit(session.id, { type: 'subqueries', items: session.subqueries })
    log(session, `Generated ${session.subqueries.length} sub-queries`)

    setPhase(session, 'researching')
    log(session, 'Researching in parallel using Parallel.ai speed model...')

    await Promise.allSettled(session.subqueries.map((sq) => limiter.schedule(() => runParallelTask(session, sq))))

    setPhase(session, 'aggregating')
    log(session, 'Aggregating all research responses...')

    await sleep(500)

    setPhase(session, 'synthesizing')
    log(session, 'Sending all data to GPT-5 for synthesis...')

    const report = await synthesize(session)
    const filePath = path.join(dataDir, `${session.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify({ ...report, sessionId: session.id }, null, 2))

    emit(session.id, { type: 'final_report', reportMd: report.markdown, reportJson: report.json })

    setPhase(session, 'completed')
    log(session, 'Research completed.')
    emit(session.id, { type: 'overall_progress', percent: 100, etaSeconds: 0 })
  } catch (e: any) {
    console.error(e)
    setPhase(session, 'error')
    log(session, `Error: ${e.message || e}`)
  }
}

async function runParallelTask(session: Session, sq: SubQuery) {
  sq.status = 'active'
  sq.startedAt = Date.now()
  emit(session.id, { type: 'subquery_update', id: sq.id, status: sq.status })

  const prog = setInterval(() => {
    if (session.paused) return
    sq.progress = Math.min(95, sq.progress + 1 + Math.random() * 2)
    emit(session.id, { type: 'subquery_update', id: sq.id, progress: sq.progress })
    setOverall(session)
  }, 250)

  try {
    const parallelResult = await withRetry(async () => callParallel(session.query, sq.text))
    sq.progress = 100
    sq.status = 'completed'
    sq.endedAt = Date.now()
    sq.sources = parallelResult.citations?.length || 0
    sq.confidence = parallelResult.confidence_score
    sq.snippet = parallelResult.answer?.slice(0, 220)
    session.results[sq.id] = parallelResult

    emit(session.id, { type: 'subquery_update', id: sq.id, status: sq.status, progress: 100, sources: sq.sources, confidence: sq.confidence, snippet: sq.snippet })
    setOverall(session)
  } catch (e: any) {
    sq.status = 'failed'
    sq.error = e?.message || String(e)
    emit(session.id, { type: 'subquery_update', id: sq.id, status: sq.status })
    setOverall(session)
  } finally {
    clearInterval(prog)
  }
}

async function callParallel(mainQuery: string, subQuery: string): Promise<ParallelResult> {
  const system = `You are a meticulous research agent. Answer the sub-query comprehensively with citations and a confidence score.`
  const user = [`Main query: ${mainQuery}`, `Sub-query: ${subQuery}`, `Return JSON matching the schema exactly.`].join('\n')

  try {
    const response = await parallel.responses.create({
      model: 'speed',
      reasoning: { effort: 'medium' },
      input: [
        { role: 'system', content: [{ type: 'text', text: system }] },
        { role: 'user', content: [{ type: 'text', text: user }] }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'parallel_research_response',
          schema: {
            type: 'object',
            properties: {
              reasoning: { type: 'string' },
              answer: { type: 'string' },
              citations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' },
                    published: { type: 'string' },
                    author: { type: 'string' }
                  },
                  required: ['url']
                }
              },
              confidence_score: { type: 'number' }
            },
            required: ['reasoning', 'answer', 'citations', 'confidence_score'],
            additionalProperties: false
          },
          strict: true
        }
      },
      temperature: 0.3
    })
    const content = response.output[0] as any
    const out = content?.content?.[0]?.text || content?.content?.[0]?.input_text
    if (typeof out === 'string') return JSON.parse(out) as ParallelResult
    if (content?.content?.[0]?.type === 'output_text') return JSON.parse(content.content[0].text) as ParallelResult
  } catch (err: any) {
    const message = err?.message || ''
    if (/not found|404|responses/i.test(message)) {
      const chat = await parallel.chat.completions.create({
        model: 'speed',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
      const text = chat.choices?.[0]?.message?.content?.trim() || '{}'
      return JSON.parse(text) as ParallelResult
    }
    throw err
  }
  throw new Error('Unexpected response format from Parallel.ai')
}

async function synthesize(session: Session): Promise<{ markdown: string; json: any }> {
  const system = `You are an expert research synthesizer. Create a publication-ready report from multiple research threads.`

  const payload = {
    original_query: session.query,
    subqueries: session.subqueries.map((sq) => ({ id: sq.id, text: sq.text })),
    responses: Object.entries(session.results).map(([id, r]) => ({ id, ...r })),
    timestamps: { created_at: new Date(session.createdAt).toISOString(), finalized_at: new Date().toISOString() }
  }

  const user = `Create a comprehensive research report that includes:\n- Executive summary with key findings\n- Methodology describing decomposition and parallel research\n- Organized analysis sections covering all sub-queries\n- Comparative analysis of different viewpoints\n- Expert insights and professional opinions\n- Recent developments and trends\n- Future implications and predictions\n- Comprehensive source bibliography with proper citations and timestamps\n- Summary tables for quick reference\n\nUse clear headings and concise, professional tone. Return only the report text.`

  const resp = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${user}\n\nDATA:\n${JSON.stringify(payload)}` }
    ],
    temperature: 0.3
  })

  const text = resp.choices?.[0]?.message?.content || 'Report generation failed.'
  return { markdown: text, json: payload }
}

function buildMarkdownReport(session: Session) {
  const lines: string[] = []
  lines.push(`# Research Report`)
  lines.push('')
  lines.push(`Original query: ${session.query}`)
  lines.push('')
  lines.push(`Sub-queries: ${session.subqueries.length}`)
  lines.push('')
  for (const [id, r] of Object.entries(session.results)) {
    lines.push(`## Thread ${id}`)
    lines.push('')
    lines.push(r.answer)
    lines.push('')
    if (r.citations?.length) {
      lines.push(`Sources:`)
      for (const c of r.citations) lines.push(`- ${c.title ? c.title + ' — ' : ''}${c.url}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let attempt = 0
  let lastErr: any
  while (attempt < tries) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const backoff = 400 * Math.pow(2, attempt) + Math.random() * 200
      await sleep(backoff)
      attempt++
    }
  }
  throw lastErr
}

app.listen(PORT, () => {
  console.log(`Deeper server listening on http://localhost:${PORT}`)
})

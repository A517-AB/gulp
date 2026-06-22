import { jules, JulesError } from '@google/jules-sdk'
import type { Activity } from '@google/jules-sdk/types'
import pc from 'picocolors'

const [,, command, ...args] = process.argv

// ── formatting ────────────────────────────────────────────────────────────────

const dim    = (s: string) => pc.dim(s)
const purple = (s: string) => pc.magenta(s)
const green  = (s: string) => pc.green(s)
const red    = (s: string) => pc.red(s)
const cyan   = (s: string) => pc.cyan(s)
const bold   = (s: string) => pc.bold(s)
const gray   = (s: string) => pc.gray(s)

function tag(label: string, color: (s: string) => string) {
    return color(`[${label}]`)
}

function fmt(activity: Activity): string {
    switch (activity.type) {
        case 'agentMessaged':
            return `${tag('agent', purple)}  ${activity.message ?? ''}`
        case 'userMessaged':
            return `${tag('user', cyan)}   ${dim(activity.message ?? '')}`
        case 'planGenerated': {
            const steps = activity.plan?.steps ?? []
            return `${tag('plan', cyan)}   ${bold(String(steps.length))} steps — ${dim(steps.map(s => s.title).join(' → '))}`
        }
        case 'planApproved':
            return `${tag('plan', green)}   ${green('approved')}`
        case 'progressUpdated': {
            const title = activity.title ?? ''
            const desc  = activity.description ? dim(` — ${activity.description}`) : ''
            const arts  = activity.artifacts?.length ? gray(` (${activity.artifacts.length} artifact(s))`) : ''
            return `${tag('work', purple)}   ${title}${desc}${arts}`
        }
        case 'sessionCompleted':
            return `${tag('done', green)}   ${green('session completed')}`
        case 'sessionFailed':
            return `${tag('fail', red)}   ${red(activity.reason ?? 'unknown')}`
        default:
            return `${tag(activity.type, gray)}`
    }
}

function stateColor(state?: string): string {
    if (!state) return gray('?')
    if (state === 'completed') return green(state)
    if (state === 'failed') return red(state)
    if (state === 'inProgress') return purple(state)
    if (state.includes('waiting') || state.includes('Waiting')) return cyan(state)
    return dim(state)
}

function hr() { console.log(dim('─'.repeat(60))) }

// ── commands ──────────────────────────────────────────────────────────────────

try {
    switch (command) {

        case 'sessions': {
            const sessions = await jules.sessions().all()
            if (!sessions.length) { console.log(dim('no sessions')); break }
            hr()
            for (const s of sessions) {
                const state = stateColor(s.state).padEnd(30)
                console.log(`${gray(s.id)}  ${state}  ${bold(s.title ?? '(untitled)')}`)
            }
            hr()
            console.log(dim(`${sessions.length} session(s)`))
            break
        }

        case 'session': {
            const id = args[0]
            if (!id) { console.error(red('usage: jules.ts session <id>')); process.exit(1) }
            const info = await jules.session(id).info()
            hr()
            console.log(`${bold('id')}     ${gray(info.id)}`)
            console.log(`${bold('state')}  ${stateColor(info.state)}`)
            console.log(`${bold('title')}  ${info.title ?? dim('(untitled)')}`)
            hr()
            break
        }

        case 'history': {
            const id = args[0]
            if (!id) { console.error(red('usage: jules.ts history <id>')); process.exit(1) }
            let count = 0
            for await (const activity of jules.session(id).history()) {
                console.log(fmt(activity))
                count++
            }
            console.log(dim(`\n${count} activities`))
            break
        }

        case 'stream': {
            const id = args[0]
            if (!id) { console.error(red('usage: jules.ts stream <id>')); process.exit(1) }
            console.log(dim(`streaming ${id}...\n`))
            for await (const activity of jules.session(id).stream()) {
                console.log(fmt(activity))
                if (activity.type === 'sessionCompleted' || activity.type === 'sessionFailed') break
            }
            break
        }

        case 'result': {
            const id = args[0]
            if (!id) { console.error(red('usage: jules.ts result <id>')); process.exit(1) }
            const outcome = await jules.session(id).result()
            hr()
            console.log(`${bold('state')}  ${stateColor(outcome.state)}`)
            if (outcome.pullRequest) console.log(`${bold('PR')}     ${cyan(outcome.pullRequest.url)}`)
            const files = outcome.generatedFiles().all()
            if (files.length) {
                console.log()
                for (const f of files) {
                    const tag_ = f.changeType === 'created' ? green('[A]') : f.changeType === 'deleted' ? red('[D]') : cyan('[M]')
                    console.log(`  ${tag_} ${f.path.padEnd(40)} ${green(`+${f.additions}`)} ${red(`-${f.deletions}`)}`)
                }
            }
            const cs = outcome.changeSet()
            if (cs) {
                console.log()
                console.log(dim('diff preview:'))
                console.log(dim(cs.gitPatch.unidiffPatch.slice(0, 800)))
            }
            hr()
            break
        }

        case 'send': {
            const [id, ...msgParts] = args
            if (!id || !msgParts.length) { console.error(red('usage: jules.ts send <id> <message>')); process.exit(1) }
            await jules.session(id).send(msgParts.join(' '))
            console.log(green('✓ sent'))
            break
        }

        case 'ask': {
            const [id, ...msgParts] = args
            if (!id || !msgParts.length) { console.error(red('usage: jules.ts ask <id> <message>')); process.exit(1) }
            const reply = await jules.session(id).ask(msgParts.join(' '))
            console.log(`${tag('agent', purple)}  ${reply.message}`)
            break
        }

        case 'approve': {
            const id = args[0]
            if (!id) { console.error(red('usage: jules.ts approve <id>')); process.exit(1) }
            await jules.session(id).approve()
            console.log(green('✓ approved'))
            break
        }

        case 'archive': {
            const id = args[0]
            if (!id) { console.error(red('usage: jules.ts archive <id>')); process.exit(1) }
            await jules.session(id).archive()
            console.log(green('✓ archived'))
            break
        }

        case 'run': {
            const [prompt, repo, branch] = args
            if (!prompt) { console.error(red('usage: jules.ts run <prompt> [repo] [branch]')); process.exit(1) }
            const config = {
                prompt,
                ...(repo ? { source: { github: repo, baseBranch: branch ?? 'main' } } : {}),
            }
            const session = await jules.run(config)
            console.log(`${green('✓ created')}  ${gray(session.id)}`)
            break
        }

        case 'sync': {
            process.stdout.write(dim('syncing...'))
            const stats = await jules.sync({ depth: 'activities', incremental: false, checkpoint: true })
            console.log(` ${green('done')}`)
            console.log(dim(JSON.stringify(stats)))
            break
        }

        case 'sources': {
            hr()
            for await (const src of jules.sources()) {
                const repo = src.githubRepo
                console.log(`${gray(src.id)}  ${bold(repo ? `${repo.owner}/${repo.repo}` : src.name)}`)
            }
            hr()
            break
        }

        case 'select': {
            const [from, ...rest] = args
            if (!from) { console.error(red('usage: jules.ts select <sessions|activities> [where json]')); process.exit(1) }
            const where = rest.length ? JSON.parse(rest.join(' ')) as Record<string, unknown> : undefined
            const results = await jules.select({ from: from as 'sessions' | 'activities', ...(where ? { where } : {}), limit: 20 })
            console.log(JSON.stringify(results, null, 2))
            break
        }

        default: {
            console.log(`
${bold(purple('jules'))} ${dim('—')} Jules SDK CLI

${bold('commands')}
  ${cyan('sessions')}                         list all sessions
  ${cyan('session')}  ${dim('<id>')}                   session info
  ${cyan('history')}  ${dim('<id>')}                   cached activity history
  ${cyan('stream')}   ${dim('<id>')}                   live stream until done
  ${cyan('result')}   ${dim('<id>')}                   final outcome + files
  ${cyan('send')}     ${dim('<id> <message>')}          fire-and-forget message
  ${cyan('ask')}      ${dim('<id> <message>')}          send and await reply
  ${cyan('approve')}  ${dim('<id>')}                   approve plan
  ${cyan('archive')}  ${dim('<id>')}                   archive session
  ${cyan('run')}      ${dim('<prompt> [repo] [br]')}   create session
  ${cyan('sync')}                             full sync
  ${cyan('sources')}                          list sources
  ${cyan('select')}   ${dim('<from> [where json]')}    query local cache
`)
        }
    }
} catch (err) {
    if (err instanceof JulesError) {
        console.error(`${red('jules error:')} ${err.message}`)
    } else {
        console.error(`${red('error:')}`, err)
    }
    process.exit(1)
}

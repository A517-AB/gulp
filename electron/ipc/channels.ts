// Single source of truth for IPC channel names.
//
// Both the main-process handlers and the renderer-side client import from here,
// so the two ends of the wire can never drift. Request channels go through
// ipcMain.handle / ipcRenderer.invoke; event channels through sender.send /
// ipcRenderer.on. Per-session streams are namespaced by id via the builders below.

export const CH = {
  client: {
    sessions:            'sdk:client.sessions',
    sessionsStreamStart: 'sdk:client.sessions.stream.start',
    sync:                'sdk:client.sync',
    select:              'sdk:client.select',
    getSessionResource:  'sdk:client.getSessionResource',
    run:                 'sdk:client.run',
    with:                'sdk:client.with',
    all:                 'sdk:client.all',
  },
  session: {
    create:       'sdk:session.create',
    send:         'sdk:session.send',
    ask:          'sdk:session.ask',
    approve:      'sdk:session.approve',
    info:         'sdk:session.info',
    result:       'sdk:session.result',
    waitFor:      'sdk:session.waitFor',
    snapshot:     'sdk:session.snapshot',
    archive:      'sdk:session.archive',
    unarchive:    'sdk:session.unarchive',
    select:       'sdk:session.select',
    applyPatch:   'sdk:session.applyPatch',
    streamStart:  'sdk:session.stream.start',
    historyStart: 'sdk:session.history.start',
    updatesStart: 'sdk:session.updates.start',
  },
  activities: {
    hydrate:      'sdk:activities.hydrate',
    select:       'sdk:activities.select',
    list:         'sdk:activities.list',
    get:          'sdk:activities.get',
    historyStart: 'sdk:activities.history.start',
    updatesStart: 'sdk:activities.updates.start',
    streamStart:  'sdk:activities.stream.start',
  },
  sources: {
    list:    'sdk:sources.list',
    get:     'sdk:sources.get',
    resolve: 'sdk:sources.resolve',
  },
  artifact: {
    save:                    'sdk:artifact.save',
    parseUnidiff:            'sdk:artifact.parseUnidiff',
    parseUnidiffWithContent: 'sdk:artifact.parseUnidiffWithContent',
  },
  util: {
    toSummary:   'sdk:util.toSummary',
    toSummaries: 'sdk:util.toSummaries',
  },
  query: {
    validate:     'sdk:query.validate',
    format:       'sdk:query.format',
    schema:       'sdk:query.schema',
    schemas:      'sdk:query.schemas',
    typeDef:      'sdk:query.typeDef',
    markdownDocs: 'sdk:query.markdownDocs',
  },
} as const

// Static (non per-id) event channels.
export const EV = {
  sessionsItem: 'sdk:client.sessions.item',
  sessionsDone: 'sdk:client.sessions.done',
  syncProgress: 'sdk:client.sync.progress',
} as const

export interface StreamChannels {
  start: string
  item:  string
  done:  string
}

export const streams = {
  sessions: (): StreamChannels => ({
    start: CH.client.sessionsStreamStart,
    item:  EV.sessionsItem,
    done:  EV.sessionsDone,
  }),

  session: (id: string): StreamChannels => ({
    start: CH.session.streamStart,
    item:  `sdk:session.stream:${id}`,
    done:  `sdk:session.stream.done:${id}`,
  }),

  sessionHistory: (id: string): StreamChannels => ({
    start: CH.session.historyStart,
    item:  `sdk:session.history:${id}`,
    done:  `sdk:session.history.done:${id}`,
  }),

  sessionUpdates: (id: string): StreamChannels => ({
    start: CH.session.updatesStart,
    item:  `sdk:session.updates:${id}`,
    done:  `sdk:session.updates.done:${id}`,
  }),

  activitiesHistory: (id: string): StreamChannels => ({
    start: CH.activities.historyStart,
    item:  `sdk:activities.history:${id}`,
    done:  `sdk:activities.history.done:${id}`,
  }),

  activitiesUpdates: (id: string): StreamChannels => ({
    start: CH.activities.updatesStart,
    item:  `sdk:activities.updates:${id}`,
    done:  `sdk:activities.updates.done:${id}`,
  }),

  activitiesStream: (id: string): StreamChannels => ({
    start: CH.activities.streamStart,
    item:  `sdk:activities.stream:${id}`,
    done:  `sdk:activities.stream.done:${id}`,
  }),
}

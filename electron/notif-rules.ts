import * as fs from 'node:fs'
import * as path from 'node:path'
import {app, ipcMain} from 'electron'
import type {NotifRule} from '@shared/electron'

function rulesPath(): string {
    return path.join(app.getPath('userData'), 'notif-rules.json')
}

export function loadRules(): NotifRule[] {
    try {
        return JSON.parse(fs.readFileSync(rulesPath(), 'utf8')) as NotifRule[]
    } catch {
        return []
    }
}

function saveRules(rules: NotifRule[]): void {
    fs.writeFileSync(rulesPath(), JSON.stringify(rules, null, 2), 'utf8')
}

export function registerNotifRulesHandlers(): void {
    ipcMain.handle('eventBus.getRules', () => loadRules())

    ipcMain.handle('eventBus.saveRule', (_e, rule: NotifRule) => {
        const rules = loadRules()
        const idx = rules.findIndex(r => r.id === rule.id)
        if (idx >= 0) rules[idx] = rule
        else rules.push(rule)
        saveRules(rules)
        return rules
    })

    ipcMain.handle('eventBus.deleteRule', (_e, id: string) => {
        saveRules(loadRules().filter(r => r.id !== id))
    })
}

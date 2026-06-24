import {formatDistanceToNow, isValid, parseISO} from 'date-fns';
import type {Activity} from '@jules';

export type ActivityType = Activity['type'];

export function formatDate(dateString: string): string {
    if (!dateString) return 'Unknown date';
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return 'Unknown date';
        return formatDistanceToNow(date, {addSuffix: true});
    } catch {
        return 'Unknown date';
    }
}

export function getActivityTypeColor(type: ActivityType): string {
    switch (type) {
        case 'agentMessaged':
            return 'bg-blue-500';
        case 'userMessaged':
            return 'bg-purple-500';
        case 'planGenerated':
            return 'bg-indigo-500';
        case 'planApproved':
            return 'bg-indigo-400';
        case 'progressUpdated':
            return 'bg-yellow-500';
        case 'sessionCompleted':
            return 'bg-green-500';
        case 'sessionFailed':
            return 'bg-red-500';
    }
}

export function mapActivity(raw: unknown): Activity {
    const r = raw as Record<string, unknown>;
    const id = ((r['name'] as string | undefined) ?? '').split('/').pop() ?? '';
    const base = {
        id,
        name: (r['name'] as string | undefined) ?? '',
        createTime: (r['createTime'] as string | undefined) ?? '',
        originator: ((r['originator'] as string | undefined) ?? 'system') as Activity['originator'],
        artifacts: [],
    };

    if (r['agentMessaged']) return {
        ...base,
        type: 'agentMessaged',
        message: ((r['agentMessaged'] as Record<string, string>)['agentMessage']) ?? ''
    };
    if (r['userMessaged']) return {
        ...base,
        type: 'userMessaged',
        message: ((r['userMessaged'] as Record<string, string>)['userMessage']) ?? ''
    };
    if (r['planGenerated']) return {
        ...base,
        type: 'planGenerated',
        plan: (r['planGenerated'] as Record<string, unknown>)['plan'] as Extract<Activity, {
            type: 'planGenerated'
        }>['plan']
    };
    if (r['planApproved']) return {
        ...base,
        type: 'planApproved',
        planId: ((r['planApproved'] as Record<string, string>)['planId']) ?? ''
    };
    if (r['progressUpdated']) {
        const p = r['progressUpdated'] as Record<string, string>;
        return {...base, type: 'progressUpdated', title: p['title'] ?? '', description: p['description'] ?? ''};
    }
    if (r['sessionCompleted']) return {...base, type: 'sessionCompleted'};
    if (r['sessionFailed']) return {
        ...base,
        type: 'sessionFailed',
        reason: ((r['sessionFailed'] as Record<string, string>)['reason']) ?? ''
    };

    return {...base, type: 'agentMessaged', message: ''};
}

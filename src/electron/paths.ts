import { join } from 'node:path'

export const projectRoot = process.cwd()
export const rendererDevUrl = process.env['VITE_DEV_SERVER_URL']
export const rendererHtmlPath = join(projectRoot, 'dist', 'index.html')
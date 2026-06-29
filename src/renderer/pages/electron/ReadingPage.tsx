import type {ChangeEvent, ReactNode} from 'react'
import {useEffect, useRef} from 'react'
import {
    Annotation,
    BookmarkView,
    FormDesigner,
    FormFields,
    LinkAnnotation,
    Magnification,
    Navigation,
    PdfViewer,
    Print,
    TextSearch,
    TextSelection,
    ThumbnailView,
    Toolbar,
} from '@syncfusion/ej2-pdfviewer'
import {useTheme} from '@renderer/providers/theme'

PdfViewer.Inject(
    Toolbar, Magnification, Navigation, LinkAnnotation, BookmarkView,
    ThumbnailView, Print, TextSelection, TextSearch, Annotation, FormFields, FormDesigner,
)

const RESOURCE_URL = `${window.location.origin}/ej2-js-es5/scripts/ej2-pdfviewer-lib/`

export default function ReadingPage(): ReactNode {
    const { theme } = useTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const viewerRef = useRef<PdfViewer | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!containerRef.current) return
        const viewer = new PdfViewer({
            resourceUrl: RESOURCE_URL,
            serviceUrl: '',
            height: '100%',
            enableToolbar: true,
            enableNavigationToolbar: true,
            enableCommentPanel: true,
            enableThumbnail: true,
            enableBookmark: true,
            enableTextSelection: true,
            enableTextSearch: true,
            enableAnnotation: true,
            enableFormFields: true,
            enableDownload: true,
            enablePrint: true,
        })
        viewer.appendTo(containerRef.current)
        viewerRef.current = viewer
        return () => {
            viewer.destroy()
            viewerRef.current = null
        }
    }, [])

    useEffect(() => {
        const id = 'syncfusion-pdf-theme'
        let link = document.getElementById(id) as HTMLLinkElement | null
        if (!link) {
            link = document.createElement('link')
            link.id = id
            link.rel = 'stylesheet'
            document.head.appendChild(link)
        }
        // TOFIX: Remove this full theme swap once PdfViewer only needs scoped Tailwind styles.
        link.href = theme === 'dark'
            ? '/ej2-js-es5/styles/tailwind3-dark.css'
            : '/ej2-js-es5/styles/tailwind3.css'
        return () => { document.getElementById(id)?.remove() }
    }, [theme])

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
            const result = evt.target?.result
            if (typeof result !== 'string') return
            const base64 = result.split(',')[1]
            if (base64) viewerRef.current?.load(base64, '')
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-2 border-b border-hair flex items-center gap-2">
                <button
                    onClick={() => { fileInputRef.current?.click() }}
                    className="text-3xs font-mono text-fg-ghost hover:text-fg-primary transition-colors"
                >
                    Open PDF
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
            <div ref={containerRef} className="flex-1 min-h-0" />
        </div>
    )
}

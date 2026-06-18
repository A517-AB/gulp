/**
 * TOOLER - Modern Edition
 * Job Application Manager with Syncfusion Integration
 */

console.log('🚀 [Tooler] Starting...');

// Import local Syncfusion CSS
import '../material3-dark.css';

// Import State module
import { State } from './State.js';

// Import Syncfusion components from LOCAL files (vanilla style)
import { Kanban } from './ej2-kanban/kanban.js';
import { Schedule, Day, Week, WorkWeek, Month, Agenda } from './ej2-schedule/index.js';
import { RichTextEditor, Toolbar as RteToolbar, Link, Image, HtmlEditor, QuickToolbar, Count, PasteCleanup, Table } from './ej2-richtexteditor/dist/es6/ej2-richtexteditor.es2015.js';
import { PdfViewer, Toolbar as PdfToolbar, Magnification, Navigation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, Annotation, FormDesigner, FormFields } from './ej2-pdfviewer/src/index.js';
import { Chart, LineSeries, ColumnSeries, Category, Legend, Tooltip, DataLabel, PieSeries, AccumulationChart, AccumulationLegend, AccumulationTooltip, AccumulationDataLabel } from './ej2-charts/src/index.js';
import { Toast as SyncfusionToast } from './ej2-notifications/dist/es6/ej2-notifications.es2015.js';
// Use Vite alias to local vanilla Spreadsheet build (lives under react/ej2-spreadsheet)

// Inject required modules
Schedule.Inject(Day, Week, WorkWeek, Month, Agenda);
RichTextEditor.Inject(RteToolbar, Link, Image, HtmlEditor, QuickToolbar, Count, PasteCleanup, Table);
PdfViewer.Inject(PdfToolbar, Magnification, Navigation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, Annotation, FormDesigner, FormFields);
Chart.Inject(LineSeries, ColumnSeries, Category, Legend, Tooltip, DataLabel);
AccumulationChart.Inject(PieSeries, AccumulationLegend, AccumulationTooltip, AccumulationDataLabel);

// Initialize state
State._init();

const escapeHtml = (value = '') =>
    `${value}`.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

// ============================================
// ROUTER
// ============================================
const Router = {
    currentView: 'dashboard',

    init() {
        document.querySelectorAll('[data-route]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const route = e.currentTarget.dataset.route;
                this.navigate(route);
            });
        });
    },

    navigate(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('view--active');
        });

        const targetView = document.querySelector(`[data-view="${viewName}"]`);
        if (targetView) {
            targetView.classList.add('view--active');
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('nav-item--active');
        });
        document.querySelector(`[data-route="${viewName}"]`)?.classList.add('nav-item--active');

        this.currentView = viewName;
    }
};

// ============================================
// TOAST NOTIFICATIONS (BOTTOM RIGHT - FIXED)
// ============================================
const Toast = {
    toastObj: null,

    init() {
        // Create toast container if it doesn't exist
      if (!document.getElementById('toast-container')) {
     const container = document.createElement('div');
   container.id = 'toast-container';
            document.body.appendChild(container);
  }

 const container = document.getElementById('toast-container');
        container.style.pointerEvents = 'none';

  // Initialize Syncfusion Toast with BOTTOM RIGHT positioning
        this.toastObj = new SyncfusionToast({
            position: { X: 'Right', Y: 'Bottom' }, // BOTTOM RIGHT
 showCloseButton: true,
   timeOut: 3200,
          animation: {
          show: { effect: 'SlideRightIn', duration: 180 },
            hide: { effect: 'SlideRightOut', duration: 160 }
            },
            cssClass: 'desktop-toast',
         target: document.body,
            newestOnTop: true,
         width: '340px'
        });

  this.toastObj.appendTo(container);
    },

    show(message, type = 'info') {
 if (!this.toastObj) {
      console.warn('[Toast] Not initialized, falling back to console');
       console.log(`[${type.toUpperCase()}]`, message);
            return;
        }

   const iconMap = {
      success: 'e-success',
            error: 'e-error',
            warning: 'e-warning',
     info: 'e-info'
        };

        this.toastObj.show({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            content: message,
       cssClass: `desktop-toast toast-${type}`,
            icon: iconMap[type] || 'e-info'
        });
    }
};

// ============================================
// MODAL UTILITY
// ============================================
const Modal = {
    create(htmlContent) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = htmlContent;

        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close(overlay);
            }
        });

        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(overlay);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        return overlay;
    },

    close(modal) {
        if (modal && modal.parentNode) {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        }
    }
};

// ============================================
// DASHBOARD MODULE
// ============================================
const Dashboard = {
    statusChart: null,
    trendChart: null,

    init() {
        this.renderStats();
        this.renderCharts();
        State.on('applications', () => {
            this.renderStats();
            this.renderCharts();
        });
    },

    renderStats() {
        const apps = State.get('applications');
        document.getElementById('stat-total').textContent = apps.length;
        document.getElementById('stat-active').textContent = apps.filter(a => a.status === 'applied').length;
        document.getElementById('stat-interviews').textContent = apps.filter(a => a.status === 'interview').length;
        document.getElementById('stat-offers').textContent = apps.filter(a => a.status === 'offer').length;
    },

    renderCharts() {
        const statusData = [
            { status: 'Draft', count: State.get('applications').filter(a => a.status === 'draft').length },
            { status: 'Applied', count: State.get('applications').filter(a => a.status === 'applied').length },
            { status: 'Interview', count: State.get('applications').filter(a => a.status === 'interview').length },
            { status: 'Offer', count: State.get('applications').filter(a => a.status === 'offer').length }
        ];

        if (this.statusChart) {
            this.statusChart.series[0].dataSource = statusData;
            this.statusChart.refresh();
        } else {
            this.statusChart = new AccumulationChart({
                series: [{
                    dataSource: statusData,
                    xName: 'status',
                    yName: 'count',
                    innerRadius: '40%',
                    dataLabel: {
                        visible: true,
                        position: 'Inside',
                        name: 'status',
                        font: { color: 'white', fontWeight: '600' }
                    }
                }],
                legendSettings: { visible: true, position: 'Bottom' },
                tooltip: { enable: true },
                title: '',
                background: 'transparent'
            });
            this.statusChart.appendTo('#status-chart');
        }

        const trendData = [
            { month: 'Dec', count: 2 },
            { month: 'Jan', count: 4 },
            { month: 'Feb', count: 3 }
        ];

        if (this.trendChart) {
            this.trendChart.series[0].dataSource = trendData;
            this.trendChart.refresh();
        } else {
            this.trendChart = new Chart({
                primaryXAxis: { valueType: 'Category', majorGridLines: { width: 0 } },
                primaryYAxis: { labelFormat: '{value}', majorTickLines: { width: 0 }, lineStyle: { width: 0 } },
                series: [{
                    dataSource: trendData,
                    xName: 'month',
                    yName: 'count',
                    type: 'Line',
                    width: 2,
                    marker: { visible: true, width: 8, height: 8 }
                }],
                tooltip: { enable: true },
                title: '',
                background: 'transparent'
            });
            this.trendChart.appendTo('#trend-chart');
        }
    }
};

// ============================================
// KANBAN BOARD MODULE
// ============================================
const KanbanBoard = {
    board: null,

    init() {
        const kanbanData = State.get('applications').map(app => ({
            Id: app.id,
            Title: app.role,
            Status: app.status,
            Summary: app.company,
            Tags: app.salary,
            Priority: 'Normal'
        }));

        this.board = new Kanban({
            dataSource: kanbanData,
            keyField: 'Status',
            columns: [
                { headerText: 'Draft', keyField: 'draft' },
                { headerText: 'Applied', keyField: 'applied' },
                { headerText: 'Interview', keyField: 'interview' },
                { headerText: 'Offer', keyField: 'offer' }
            ],
            cardSettings: {
                contentField: 'Summary',
                headerField: 'Title',
                tagsField: 'Tags'
            },
            swimlaneSettings: { keyField: 'Priority' },
            dragStop: (args) => {
                if (args.data && args.data[0]) {
                    const card = args.data[0];
                    State.update('applications', card.Id, { status: card.Status });
                    Toast.show(`Moved ${card.Title} to ${card.Status}`, 'success');
                }
            }
        });

        this.board.appendTo('#kanban-board');
        State.on('applications', () => this.sync());
    },

    sync() {
        if (!this.board || !this.board.element || !this.board.element.isConnected) return;
        if (Router?.currentView !== 'kanban') return;
        const apps = State.get('applications').map(app => ({
            Id: app.id,
            Title: app.role,
            Status: app.status,
            Summary: app.company,
            Tags: app.salary,
            Priority: 'Normal'
        }));
        try {
            this.board.dataSource = apps;
            // Defer refresh to avoid race with internal drag/unwire teardown
            requestAnimationFrame(() => {
                if (this.board?.element?.isConnected) this.board.refresh();
            });
        } catch (e) {
            console.warn('[Kanban] Refresh skipped:', e?.message || e);
        }
    }
};

// ============================================
// JOB TRACKER MODULE
// ============================================
const JobTracker = {
    spreadsheet: null,
    data: [],
    headers: ['Company', 'Role', 'Date', 'Source', 'Notes'],
    selectedRow: null,
    ingestBound: false,

    init() {
        const mountPoint = document.getElementById('tracker-spreadsheet');
        if (!mountPoint) return;

        const stored = State.get('trackerEntries') || [];
        this.data = stored.map(entry => ({
            Company: entry.Company || entry.company || '',
            Role: entry.Role || entry.role || '',
            Date: entry.Date || entry.date || '',
            Source: entry.Source || entry.source || '',
            Notes: entry.Notes || entry.notes || ''
        }));

        if (this.spreadsheet) {
            this.refresh();
        } else {
            this.spreadsheet = new Spreadsheet({
                height: '540px',
                showSheetTabs: false,
                allowInsert: true,
                allowOpen: false,
                allowSave: false,
                allowDelete: true,
                sheets: [{
                    name: 'Tracker',
                    rows: [{
                        cells: this.headers.map(title => ({
                            value: title,
                            style: { fontWeight: 'bold', textAlign: 'Center' }
                        }))
                    }],
                    ranges: [{ dataSource: this.data, startCell: 'A2' }],
                    columns: [
                        { width: 160 },
                        { width: 180 },
                        { width: 120 },
                        { width: 180 },
                        { width: 260 }
                    ]
                }],
                cellSelected: (args) => {
                    const rowIndex = (args.rangeIndexes ? args.rangeIndexes[0] : 1) - 1;
                    this.selectedRow = Math.max(rowIndex, 0);
                },
                cellSave: (args) => {
                    if (!args || !args.rangeIndexes) return;
                    const rowIndex = args.rangeIndexes[0] - 1;
                    const colIndex = args.rangeIndexes[1];
                    const header = this.headers[colIndex];
                    if (rowIndex >= 0 && header) {
                        if (!this.data[rowIndex]) this.data[rowIndex] = this.createEmptyRecord();
                        this.data[rowIndex][header] = args.value || '';
                        this.persist();
                    }
                }
            });
            this.spreadsheet.appendTo('#tracker-spreadsheet');
        }

        this.bindIngest();
        this.refresh();
    },

    bindIngest() {
        if (this.ingestBound) return;
        const dropzone = document.getElementById('tracker-dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (event) => {
                event.preventDefault();
                dropzone.classList.add('drag-over');
            });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
            dropzone.addEventListener('drop', async (event) => {
                event.preventDefault();
                dropzone.classList.remove('drag-over');
                const file = event.dataTransfer?.files?.[0];
                if (file) {
                    const text = await file.text().catch(() => '');
                    if (text) {
                        this.processSnippet(text, `File: ${file.name}`);
                    } else {
                        Toast.show('Unable to read dropped file.', 'error');
                    }
                } else {
                    const text = event.dataTransfer?.getData('text');
                    if (text) {
                        this.processSnippet(text, 'Dropped text');
                    } else {
                        Toast.show('Nothing to import from that drop.', 'warning');
                    }
                }
            });
            dropzone.addEventListener('paste', (event) => {
                const text = event.clipboardData?.getData('text');
                if (!text) return;
                event.preventDefault();
                this.processSnippet(text, 'Clipboard paste');
            });
        }

        document.getElementById('tracker-add-manual')?.addEventListener('click', () => {
            this.addRecord(this.createEmptyRecord(), { silentDuplicateCheck: true });
            Toast.show('Blank row added.', 'info');
        });

        document.getElementById('tracker-clear')?.addEventListener('click', () => {
            if (!this.data.length) {
                Toast.show('Tracker is already empty.', 'warning');
                return;
            }
            if (confirm('This will clear all tracker entries. Continue?')) {
                this.data = [];
                this.persist();
                this.refresh();
                Toast.show('Tracker cleared.', 'info');
            }
        });

        document.getElementById('tracker-import-extractor')?.addEventListener('click', () => {
            const draft = State.get('extractorDraft');
            if (!draft) {
                Toast.show('Extractor has no recent text.', 'warning');
                return;
            }
            this.processSnippet(draft, 'Extractor draft');
        });

        document.getElementById('tracker-send-kanban')?.addEventListener('click', () => this.sendSelectedToKanban());

        this.ingestBound = true;
    },

    createEmptyRecord() {
        return {
            Company: '',
            Role: '',
            Date: new Date().toISOString().slice(0, 10),
            Source: '',
            Notes: ''
        };
    },

    processSnippet(text, sourceLabel) {
        const record = this.parseSnippet(text);
        if (sourceLabel && !record.Source) record.Source = sourceLabel;
        record.Notes = record.Notes || text.trim();
        this.addRecord(record);
    },

    parseSnippet(text) {
        const record = this.createEmptyRecord();
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const joined = text.replace(/\s+/g, ' ');

        const companyLine = lines.find(line => /company\s*[:\-]/i.test(line));
        if (companyLine) {
            record.Company = companyLine.replace(/company\s*[:\-]\s*/i, '').trim();
        } else if (lines[0]) {
            record.Company = lines[0].replace(/^Company\s*/i, '').trim();
        }

        const roleLine = lines.find(line => /(role|position|title)\s*[:\-]/i.test(line));
        if (roleLine) {
            record.Role = roleLine.replace(/(role|position|title)\s*[:\-]\s*/i, '').trim();
        } else {
            const matchRole = joined.match(/\b(Developer|Engineer|Manager|Designer|Lead|Director|Analyst|Consultant)\b.*?(?= at | for | with |$)/i);
            if (matchRole) record.Role = matchRole[0];
        }

        const dateMatch = joined.match(/\b(20\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.? ?\d{1,2},? ?20\d{2})\b/i);
        if (dateMatch) {
            record.Date = this.normalizeDate(dateMatch[0]);
        }

        if (!record.Source && lines.length > 1) {
            record.Source = lines[1].slice(0, 80);
        }

        record.Notes = text.trim();
        return record;
    },

    normalizeDate(input) {
        const parsed = new Date(input);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
        const parts = input.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (parts) {
            const [_, year, month, day] = parts;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        return new Date().toISOString().slice(0, 10);
    },

    addRecord(record, { silentDuplicateCheck } = {}) {
        const normalized = {
            Company: (record.Company || 'Unknown company').trim(),
            Role: (record.Role || 'Role TBD').trim(),
            Date: record.Date || new Date().toISOString().slice(0, 10),
            Source: (record.Source || 'Manual entry').trim(),
            Notes: (record.Notes || '').trim()
        };

        this.data = [normalized, ...this.data];
        this.persist();
        this.refresh();
        this.selectedRow = 0;

        if (!silentDuplicateCheck && this.existsInApplications(normalized)) {
            Toast.show('Heads up: this company is already on your board.', 'warning');
        } else {
            Toast.show('Job idea captured in tracker.', 'success');
        }
    },

    existsInApplications(record) {
        const apps = State.get('applications') || [];
        return apps.some(app =>
            app.company?.toLowerCase() === record.Company.toLowerCase() &&
            app.role?.toLowerCase() === record.Role.toLowerCase()
        );
    },

    persist() {
        State.set('trackerEntries', this.data.map(item => ({ ...item })));
    },

    refresh() {
        if (!this.spreadsheet) return;
        const sheet = this.spreadsheet.sheets[0];
        sheet.ranges[0].dataSource = this.data.map(item => ({ ...item }));
        this.spreadsheet.dataBind();
        this.spreadsheet.selectRange('A2');
    },

    sendSelectedToKanban() {
        const index = this.selectedRow ?? 0;
        const record = this.data[index];
        if (!record) {
            Toast.show('Select a row first.', 'warning');
            return;
        }

        if (this.existsInApplications(record)) {
            Toast.show('Already on the board. Update the existing card instead.', 'warning');
            return;
        }

        const newApp = {
            id: Date.now().toString(),
            company: record.Company || 'Unnamed company',
            role: record.Role || 'Role TBD',
            status: 'draft',
            salary: record.Source || '',
            date: record.Date || new Date().toISOString()
        };

        State.add('applications', newApp);
        if (KanbanBoard.board) {
            KanbanBoard.board.addCard({
                Id: newApp.id,
                Title: newApp.role,
                Status: newApp.status,
                Summary: newApp.company,
                Tags: newApp.salary,
                Priority: 'Normal'
            });
        }

        Toast.show('Sent to Kanban board.', 'success');
    }
};

// ============================================
// SCHEDULER/CALENDAR MODULE
// ============================================
const Calendar = {
    scheduler: null,

    init() {
        this.scheduler = new Schedule({
            width: '100%',
            height: '650px',
            selectedDate: new Date(),
            views: ['Day', 'Week', 'WorkWeek', 'Month', 'Agenda'],
            currentView: 'Month',
            eventSettings: { dataSource: State.get('events') },
            actionComplete: (args) => {
                if (args.requestType === 'eventCreated') {
                    Toast.show('Event created successfully', 'success');
                } else if (args.requestType === 'eventChanged') {
                    Toast.show('Event updated successfully', 'success');
                } else if (args.requestType === 'eventRemoved') {
                    Toast.show('Event deleted successfully', 'success');
                }
            }
        });

        this.scheduler.appendTo('#scheduler');

        document.querySelector('[data-action="calendar-today"]')?.addEventListener('click', () => {
            this.scheduler.selectedDate = new Date();
        });

        document.querySelector('[data-action="new-event"]')?.addEventListener('click', () => {
            this.scheduler.openEditor(null, 'Add');
        });
    }
};

// ============================================
// WORKSPACE CANVAS (Syncfusion playground)
// ============================================
const WorkspaceCanvas = {
    root: null,
    initialized: false,
    kanban: null,
    scheduler: null,
    statusChart: null,
    trendChart: null,
    spreadsheet: null,
    rte: null,
    pdfViewer: null,

    init() {
        if (this.initialized) return;
        this.root = document.getElementById('workspace-canvas');
        if (!this.root) return;

        this.initKanban();
        this.initScheduler();
        this.initCharts();
        this.initSpreadsheet();
        this.initRte();
        this.initPdf();
        this.subscribeToState();

        this.initialized = true;
    },

    enter() {
        if (!this.initialized) {
            this.init();
        }
        this.refreshVisuals();
    },

    subscribeToState() {
        State.on('applications', () => {
            this.refreshKanban();
            this.refreshCharts();
        });
        State.on('events', () => this.refreshScheduler());
        State.on('trackerEntries', () => this.refreshSpreadsheet());
    },

    // ---- Kanban ----
    initKanban() {
        const mount = document.getElementById('canvas-kanban');
        if (!mount) return;
        this.kanban = new Kanban({
            height: '320px',
            dataSource: this.getKanbanData(),
            keyField: 'Status',
            columns: [
                { headerText: 'Draft', keyField: 'draft' },
                { headerText: 'Applied', keyField: 'applied' },
                { headerText: 'Interview', keyField: 'interview' },
                { headerText: 'Offer', keyField: 'offer' }
            ],
            cardSettings: {
                contentField: 'Summary',
                headerField: 'Title',
                tagsField: 'Tags'
            }
        });
        this.kanban.appendTo('#canvas-kanban');
    },

    getKanbanData() {
        return (State.get('applications') || []).map(app => ({
            Id: app.id,
            Title: app.role,
            Status: app.status,
            Summary: app.company,
            Tags: app.salary,
            Priority: 'Default',
            Date: app.date
        }));
    },

    refreshKanban() {
        if (!this.kanban) return;
        this.kanban.dataSource = this.getKanbanData();
        this.kanban.refresh();
    },

    // ---- Scheduler ----
    initScheduler() {
        const mount = document.getElementById('canvas-scheduler');
        if (!mount) return;
        this.scheduler = new Schedule({
            width: '100%',
            height: '340px',
            selectedDate: new Date(),
            currentView: 'Week',
            views: ['Day', 'Week', 'Month', 'Agenda'],
            eventSettings: { dataSource: this.getEvents() }
        });
        this.scheduler.appendTo('#canvas-scheduler');
    },

    getEvents() {
        return Array.isArray(State.get('events')) ? State.get('events') : [];
    },

    refreshScheduler() {
        if (!this.scheduler) return;
        this.scheduler.eventSettings.dataSource = this.getEvents();
        if (typeof this.scheduler.refresh === 'function') {
            this.scheduler.refresh();
        }
    },

    // ---- Charts ----
    initCharts() {
        const statusMount = document.getElementById('canvas-status-chart');
        const trendMount = document.getElementById('canvas-trend-chart');
        if (statusMount) {
            this.statusChart = new AccumulationChart({
                height: '200px',
                legendSettings: { visible: false },
                tooltip: { enable: true },
                series: [{
                    dataSource: this.getStatusData(),
                    xName: 'status',
                    yName: 'count',
                    innerRadius: '50%',
                    dataLabel: {
                        visible: true,
                        name: 'text',
                        position: 'Inside',
                        font: { size: '12px' }
                    }
                }],
                background: 'transparent'
            });
            this.statusChart.appendTo('#canvas-status-chart');
        }

        if (trendMount) {
            this.trendChart = new Chart({
                height: '200px',
                primaryXAxis: {
                    valueType: 'Category',
                    majorGridLines: { width: 0 }
                },
                primaryYAxis: {
                    minimum: 0,
                    interval: 1,
                    lineStyle: { width: 0 },
                    majorTickLines: { width: 0 }
                },
                tooltip: { enable: true },
                chartArea: { border: { width: 0 } },
                series: [{
                    dataSource: this.getTrendData(),
                    xName: 'month',
                    yName: 'count',
                    type: 'Line',
                    width: 2,
                    marker: { visible: true, width: 8, height: 8 }
                }],
                background: 'transparent'
            });
            this.trendChart.appendTo('#canvas-trend-chart');
        }
    },

    getStatusData() {
        const apps = this.getKanbanData();
        const statusMap = new Map();
        apps.forEach(card => {
            const status = (card.Status || 'draft').toLowerCase();
            statusMap.set(status, (statusMap.get(status) || 0) + 1);
        });
        const data = Array.from(statusMap.entries()).map(([status, count]) => ({
            status: status.charAt(0).toUpperCase() + status.slice(1),
            count,
            text: `${count}`
        }));
        return data.length ? data : [{ status: 'No data', count: 1, text: '0' }];
    },

    getTrendData() {
        const apps = this.getKanbanData();
        const buckets = new Map();
        apps.forEach(card => {
            const rawDate = card.Date || Date.now();
            const date = new Date(rawDate);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            const label = `${date.toLocaleString('default', { month: 'short' })} '${String(date.getFullYear()).slice(-2)}`;
            const current = buckets.get(key) || { month: label, count: 0, order: new Date(date.getFullYear(), date.getMonth(), 1).getTime() };
            current.count += 1;
            buckets.set(key, current);
        });
        const list = Array.from(buckets.values()).sort((a, b) => a.order - b.order);
        return list.length ? list.slice(-6) : [{ month: 'This month', count: apps.length, order: Date.now() }];
    },

    refreshCharts() {
        if (this.statusChart) {
            this.statusChart.series[0].dataSource = this.getStatusData();
            this.statusChart.refresh();
        }
        if (this.trendChart) {
            this.trendChart.series[0].dataSource = this.getTrendData();
            this.trendChart.refresh();
        }
    },

    // ---- Spreadsheet ----
    initSpreadsheet() {
        const mount = document.getElementById('canvas-spreadsheet');
        if (!mount) return;
        this.spreadsheet = new Spreadsheet({
            height: '320px',
            showRibbon: false,
            showFormulaBar: false,
            showSheetTabs: false,
            allowOpen: false,
            allowSave: false,
            sheets: [{
                name: 'Scratchpad',
                rows: [{
                    cells: ['Company', 'Role', 'Stage', 'Notes'].map(title => ({
                        value: title,
                        style: { fontWeight: 'bold', textAlign: 'Center' }
                    }))
                }],
                ranges: [{ dataSource: this.getSheetData(), startCell: 'A2' }],
                columns: [
                    { width: 140 },
                    { width: 160 },
                    { width: 120 },
                    { width: 220 }
                ]
            }]
        });
        this.spreadsheet.appendTo('#canvas-spreadsheet');
    },

    getSheetData() {
        const tracker = Array.isArray(State.get('trackerEntries')) ? State.get('trackerEntries') : [];
        if (!tracker.length) {
            return [{
                Company: 'Acme Corp',
                Role: 'Product Designer',
                Stage: 'Draft',
                Notes: 'Use this canvas to stage quick leads.'
            }];
        }
        return tracker.slice(0, 6).map(entry => ({
            Company: entry.Company || entry.company || 'Unknown',
            Role: entry.Role || entry.role || 'TBD',
            Stage: entry.Stage || entry.status || entry.Source || 'Draft',
            Notes: entry.Notes || entry.notes || ''
        }));
    },

    refreshSpreadsheet() {
        if (!this.spreadsheet) return;
        const sheet = this.spreadsheet.sheets?.[0];
        if (!sheet?.ranges?.length) return;
        sheet.ranges[0].dataSource = this.getSheetData();
        this.spreadsheet.dataBind();
    },

    // ---- Rich text ----
    initRte() {
        const mount = document.getElementById('canvas-rte');
        if (!mount) return;
        const draft = localStorage.getItem('workspace-rte-draft') || '';
        this.rte = new RichTextEditor({
            height: '300px',
            placeholder: 'Draft quick snippets before sending them elsewhere.',
            toolbarSettings: {
                items: ['Bold', 'Italic', 'Underline', 'StrikeThrough', 'FontColor', 'BackgroundColor', '|', 'Alignments', 'OrderedList', 'UnorderedList', '|', 'CreateLink', 'Image', '|', 'Undo', 'Redo']
            },
            change: () => this.saveRteDraft()
        });
        this.rte.appendTo('#canvas-rte');
        if (draft) {
            this.rte.value = draft;
            this.rte.dataBind();
        }
    },

    saveRteDraft() {
        if (this.rte?.value !== undefined) {
            localStorage.setItem('workspace-rte-draft', this.rte.value);
        }
    },

    // ---- PDF viewer ----
    initPdf() {
        const mount = document.getElementById('canvas-pdf');
        if (!mount) return;
        this.pdfViewer = new PdfViewer({
            height: '320px',
            documentPath: '',
            enableToolbar: false,
            enableNavigationToolbar: true,
            enableThumbnail: false,
            enableBookmark: false,
            enableAnnotation: false,
            enableTextSelection: true,
            resourceUrl: new URL('ej2-pdfviewer-lib', window.location.href).href
        });
        this.pdfViewer.appendTo('#canvas-pdf');
    },

    refreshVisuals() {
        this.refreshKanban();
        this.refreshCharts();
        this.refreshScheduler();
        this.refreshSpreadsheet();
        if (typeof this.rte?.refreshUI === 'function') {
            this.rte.refreshUI();
        }
        if (typeof this.pdfViewer?.refresh === 'function') {
            this.pdfViewer.refresh();
        }
    }
};

// ============================================
// PDF STUDIO MODULE (ENHANCED)
// ============================================
const PdfStudio = {
    viewer: null,
    currentDocument: null,
    settings: { backend: 'client', customUrl: '' },
    shelf: [], // recent PDFs metadata
    templates: [],
    statusEl: null,
    viewerShell: null,
    isDocLoaded: false,

    init() {
        console.log('[PDF Studio] Initializing with client-side rendering...');

        // Load settings
        const saved = State.get('pdfSettings') || { backend: 'client', customUrl: '' };
        this.settings = saved;
        this.shelf = State.get('pdfShelf') || [];
        this.statusEl = document.getElementById('pdf-viewer-status');
        this.viewerShell = document.getElementById('pdf-viewer-container');
        this.setStatus('Preparing viewer...');
        this.renderBackendControls();
        this.renderShelf();

        const viewerContainer = this.viewerShell;
        if (!viewerContainer) {
            console.error('[PDF Studio] Container not found');
            return;
        }

        try {
            // Initialize Syncfusion PDF Viewer (client-side mode)
            this.viewer = new PdfViewer({
                documentPath: '',
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
                resourceUrl: new URL('ej2-pdfviewer-lib', window.location.href).href,
                // Optional serviceUrl if backend selected
                serviceUrl: this.settings.backend === 'custom' ? this.settings.customUrl
                    : this.settings.backend === 'local' ? 'http://localhost:5000/pdf' : '',
                documentLoad: (args) => {
                    console.log('[PDF Studio] Document loaded successfully');
                    Toast.show('PDF loaded successfully', 'success');
                    this.currentDocument = args.documentName;
                    this.addToShelf({ name: args.documentName, openedAt: Date.now() });
                    this.setStatus(`${args.documentName || 'PDF document'} loaded`);
                    this.isDocLoaded = true;
                },
                documentLoadFailed: (args) => {
                    console.error('[PDF Studio] Load failed:', args);
                    Toast.show('Failed to load PDF: ' + args.errorMessage, 'error');
                    this.setStatus('Failed to load document');
                    this.isDocLoaded = false;
                }
            });

            if (this.viewerShell) {
                this.viewerShell.innerHTML = '';
            }
            this.viewer.appendTo('#pdf-viewer-container');
            this.setStatus('Viewer ready');
            this.renderSidebarTemplates(Library?.templates || []);

            // Setup UI handlers
            this.setupFileUpload();
            this.bindToolbarButtons();

            Toast.show('PDF Studio ready', 'success');
        } catch (error) {
            console.error('[PDF Studio] Initialization error:', error);
            Toast.show('PDF Studio initialization failed', 'error');
        }
    },

    bindToolbarButtons() {
        document.getElementById('pdf-browse')?.addEventListener('click', () => {
            document.getElementById('pdf-file-upload')?.click();
        });
        document.getElementById('pdf-upload')?.addEventListener('click', () => {
            document.getElementById('pdf-file-upload')?.click();
        });
        document.getElementById('pdf-save')?.addEventListener('click', () => {
            this.saveToLibrary();
        });
        document.getElementById('pdf-download')?.addEventListener('click', () => this.exportPdf());
        document.getElementById('pdf-print-btn')?.addEventListener('click', () => this.printPdf());
        document.getElementById('pdf-paste')?.addEventListener('click', async () => {
            let clipboardChecked = false;
            try {
                if (navigator.clipboard?.read) {
                    clipboardChecked = true;
                    const items = await navigator.clipboard.read();
                    for (const item of items) {
                        if (item.types.includes('application/pdf')) {
                            const blob = await item.getType('application/pdf');
                            const file = new File([blob], `clipboard-${Date.now()}.pdf`, { type: 'application/pdf' });
                            this.isDocLoaded = false;
                            this.loadPdfFile(file);
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error('[PDF Studio] Clipboard read failed:', error);
                Toast.show('Clipboard access denied.', 'error');
                return;
            }

            try {
                if (navigator.clipboard?.readText) {
                    clipboardChecked = true;
                    const text = await navigator.clipboard.readText();
                    if (text.startsWith('data:application/pdf;base64,')) {
                        const base64 = text.split(',')[1];
                        this.isDocLoaded = false;
                        this.viewer?.load(base64, 'Clipboard.pdf');
                        return;
                    }
                }
            } catch (error) {
                console.error('[PDF Studio] Clipboard text read failed:', error);
                Toast.show('Clipboard access denied.', 'error');
                return;
            }

            const message = clipboardChecked
                ? 'Clipboard does not contain a PDF document.'
                : 'Clipboard access is not available in this environment.';
            Toast.show(message, 'warning');
        });

        // Shelf open handlers (delegated in renderShelf)
    },

    renderBackendControls() {
        const select = document.getElementById('pdf-backend-select');
        const custom = document.getElementById('pdf-backend-custom');
        if (!select) return;

        // Initialize values
        select.value = this.settings.backend;
        if (custom) {
            custom.value = this.settings.customUrl || '';
            custom.style.display = this.settings.backend === 'custom' ? 'block' : 'none';
        }

        select.onchange = (e) => {
            this.settings.backend = e.target.value;
            if (custom) custom.style.display = this.settings.backend === 'custom' ? 'block' : 'none';
            State.set('pdfSettings', this.settings);
            Toast.show(`PDF backend: ${this.settings.backend}`, 'info');
            this.setStatus(`Backend set to ${this.settings.backend}`);
        };
        custom?.addEventListener('change', (e) => {
            this.settings.customUrl = e.target.value.trim();
            State.set('pdfSettings', this.settings);
            Toast.show('Custom backend URL saved', 'success');
            this.setStatus('Custom service URL stored');
        });
    },

    renderShelf() {
        const list = document.getElementById('pdf-shelf-list');
        if (!list) return;
        const items = (this.shelf || []).slice(0, 10);
        list.innerHTML = items.length ? items.map(i => `
            <button class="shelf-item" data-name="${i.name}">
              <span class="shelf-name">${i.name}</span>
              <span class="shelf-date">${new Date(i.openedAt).toLocaleDateString()}</span>
            </button>
        `).join('') : '<div class="empty-state">Open documents to build your shelf.</div>';

        list.querySelectorAll('.shelf-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                // Re-open via file picker limited to PDFs
                const input = document.getElementById('pdf-file-upload');
                if (input) input.click();
            });
        });
    },

    addToShelf(entry) {
        if (!entry?.name) return;
        const filtered = this.shelf.filter(x => x.name !== entry.name);
        filtered.unshift(entry);
        this.shelf = filtered.slice(0, 10);
        State.set('pdfShelf', this.shelf);
        this.renderShelf();
    },

    setupFileUpload() {
        const fileInput = document.getElementById('pdf-file-upload');
        const dropZone = document.getElementById('pdf-dropzone');
        const editorCol = document.querySelector('.pdf-editor-column');
        const workspace = document.querySelector('.pdf-workspace');

        let dragDepth = 0;
        const setDragActive = (active) => {
            const method = active ? 'add' : 'remove';
            editorCol?.classList[method]('drag-active');
            workspace?.classList[method]('drag-active');
            if (!active) dragDepth = 0;
        };

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type === 'application/pdf') {
                    this.isDocLoaded = false;
                    this.loadPdfFile(file);
                } else {
                    Toast.show('Please select a valid PDF file', 'warning');
                }
                e.target.value = '';
            });
        }

        // Window/column drag overlay activation only for files
        const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

        const onDragEnter = (e) => {
            if (!isFileDrag(e)) return;
            dragDepth += 1;
            setDragActive(true);
        };
        const onDragOver = (e) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
        };
        const onDragLeave = (e) => {
            if (!isFileDrag(e)) return;
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0) setDragActive(false);
        };
        const onDrop = (e) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer?.files?.[0];
            if (file && file.type === 'application/pdf') {
                this.isDocLoaded = false;
                this.loadPdfFile(file);
            } else {
                Toast.show('Please drop a valid PDF file', 'warning');
            }
        };

        // Bind at workspace level to reduce interference with other views
        workspace?.addEventListener('dragenter', onDragEnter);
        workspace?.addEventListener('dragover', onDragOver);
        workspace?.addEventListener('dragleave', onDragLeave);
        workspace?.addEventListener('drop', onDrop);

        // Keep dropZone clickable if shown
        if (dropZone) {
            dropZone.addEventListener('click', () => fileInput?.click());
            dropZone.addEventListener('dragover', (e) => { if (isFileDrag(e)) e.preventDefault(); });
            dropZone.addEventListener('drop', onDrop);
        }
    },

    loadPdfFile(file) {
        if (!this.viewer) {
            Toast.show('PDF Viewer not initialized', 'error');
            return;
        }
        this.setStatus(`Loading ${file.name}...`);

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const base64 = e.target.result.split(',')[1];
                this.viewer.load(base64, null);
                this.addToShelf({ name: file.name, openedAt: Date.now() });
                Toast.show(`Loading ${file.name}...`, 'info');
            } catch (error) {
                console.error('[PDF Studio] Load error:', error);
                Toast.show('Failed to load PDF file', 'error');
            }
        };

        reader.onerror = () => {
            Toast.show('Failed to read PDF file', 'error');
        };

        reader.readAsDataURL(file);
    },

    exportPdf() {
        if (!this.viewer || !this.isDocLoaded) {
            Toast.show('No document loaded', 'warning');
            return;
        }

        try {
            this.viewer.download();
            Toast.show('Downloading PDF...', 'success');
            this.setStatus('Download started');
        } catch (error) {
            console.error('[PDF Studio] Export error:', error);
            Toast.show('Failed to export PDF', 'error');
            this.setStatus('Export failed');
        }
    },

    printPdf() {
        if (!this.viewer || !this.isDocLoaded) {
            Toast.show('No document loaded', 'warning');
            return;
        }

        try {
            this.viewer.print.print();
            Toast.show('Opening print dialog...', 'info');
            this.setStatus('Printing document');
        } catch (error) {
            console.error('[PDF Studio] Print error:', error);
            Toast.show('Failed to print PDF', 'error');
            this.setStatus('Print failed');
        }
    },

    async saveToLibrary() {
        try {
            // Prefer Electron for filesystem
            if (window.electronAPI?.writePdf && this.viewer) {
                this.viewer.download(); // let user choose location via browser/Electron
                Toast.show('Saved via download', 'success');
                return;
            }
            // Fallback: instruct user if not Electron
            Toast.show('Use Download to save your PDF locally', 'info');
        } catch (e) {
            console.error(e);
            Toast.show('Save failed', 'error');
        }
    },

    setStatus(message) {
        if (!message) return;
        if (!this.statusEl) this.statusEl = document.getElementById('pdf-viewer-status');
        if (this.statusEl) this.statusEl.textContent = message;
    },

    renderSidebarTemplates(templates = []) {
        this.templates = Array.isArray(templates) ? templates : [];

        const quickList = document.getElementById('pdf-templates');
        const coverList = document.getElementById('pdf-workcovers');

        const normalized = this.templates.map(template => ({
            ...template,
            type: (template.type || 'other').toLowerCase()
        }));

        const usable = normalized.filter(t => !!t.data);

        const buildList = (items, container, emptyMessage) => {
            if (!container) return;
            if (!items.length) {
                container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
                return;
            }
            container.innerHTML = items.map(t => this.templateButtonMarkup(t)).join('');
            container.querySelectorAll('[data-template-id]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const template = this.templates.find(item => item.id === btn.dataset.templateId);
                    if (template) this.openTemplate(template);
                });
            });
        };

        buildList(
            usable.filter(t => t.type !== 'cover'),
            quickList,
            'Save templates to access them quickly.'
        );

        buildList(
            usable.filter(t => t.type === 'cover'),
            coverList,
            'Save work cover layouts here.'
        );
    },

    templateButtonMarkup(template) {
        const name = escapeHtml(template.name || 'Untitled Template');
        const label = escapeHtml((template.type || 'template').replace(/_/g, ' '));
        return `
      <button class="template-pill" data-template-id="${template.id}">
        <span class="template-pill__name">${name}</span>
        <span class="template-pill__meta">${label}</span>
      </button>
    `;
    },

    openTemplate(template) {
        if (!template?.data) {
            Toast.show('Template file missing. Re-upload to use this template.', 'warning');
            return;
        }

        const loadDocument = () => {
            if (!this.viewer) {
                setTimeout(loadDocument, 150);
                return;
            }
            try {
                this.isDocLoaded = false;
                this.setStatus(`Loading ${template.name || 'Template'}...`);
                this.viewer.load(template.data, template.name || 'Template');
            } catch (error) {
                console.error('[PDF Studio] Failed to open template:', error);
                Toast.show('Failed to open template', 'error');
            }
        };

        if (Router?.currentView !== 'pdf-studio') {
            Router?.navigate?.('pdf-studio');
            setTimeout(loadDocument, 160);
        } else {
            loadDocument();
        }
    }
};

// ============================================
// EXTRACTOR MODULE (NEW)
// ============================================
const Extractor = {
    initialized: false,
    pasteAttached: false,
    boundPasteHandler: null,
    init() {
        const dz = document.getElementById('extractor-dropzone');
        const list = document.getElementById('extractor-results');
        const applyBtn = document.getElementById('extractor-apply');
        const clearBtn = document.getElementById('extractor-clear');

        if (!dz) return;

        if (this.initialized) return;
        this.initialized = true;

        if (!this.boundPasteHandler) {
            this.boundPasteHandler = (event) => this.handlePaste(event);
            document.addEventListener('paste', this.boundPasteHandler);
        }

        dz.addEventListener('dragover', (e) => {
            e.preventDefault();
            dz.classList.add('drag-over');
        });
        dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
        dz.addEventListener('drop', async (e) => {
            e.preventDefault();
            dz.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (!file) return;
            const text = await file.text().catch(() => '');
            if (!text) {
                Toast.show('Unsupported file. Try .txt or .csv', 'warning');
                return;
            }
            this.processText(text);
        });

        dz.addEventListener('paste', (e) => {
            const text = e.clipboardData?.getData('text');
            if (!text) return;
            e.preventDefault();
            this.processText(text);
        });

        applyBtn?.addEventListener('click', () => {
            const selected = Array.from(document.querySelectorAll('.extract-item input:checked')).map(cb => cb.value);
            const existing = State.get('snippets') || [];
            const additions = selected.map(v => ({ label: 'Extracted', content: v }));
            State.set('snippets', existing.concat(additions));
            Toast.show('Added selected items to snippets', 'success');
        });

        clearBtn?.addEventListener('click', () => {
            const container = document.getElementById('extractor-results');
            if (container) {
                container.innerHTML = '<p class="empty-state">Drop a file or paste text to see detected items.</p>';
            }
            Toast.show('Extractor cleared', 'info');
        });
    },

    processText(rawText) {
        const text = rawText?.trim();
        if (!text) {
            Toast.show('Nothing to extract from that input.', 'warning');
            return;
        }
        State.set('extractorDraft', text);
        const data = this.extract(text);
        this.render(data);
        Toast.show('Content processed.', 'info');
    },

    handlePaste(event) {
        if (Router?.currentView !== 'extractor') return;
        const text = event.clipboardData?.getData('text');
        if (!text) return;
        event.preventDefault();
        this.processText(text);
    },

    extract(text) {
        const phones = [...new Set((text.match(/\+?\d[\d\s().-]{6,}\d/g) || []).map(s => s.trim()))];
        const emails = [...new Set((text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []))];
        const companies = [...new Set((text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s(?:Inc\.|LLC|Ltd\.|Company|Co\.|Corp\.)\b/g) || []))];
        const urls = [...new Set((text.match(/https?:\/\/[^\s)]+/g) || []))];
        return { phones, emails, companies, urls };
    },

    render(data) {
        const container = document.getElementById('extractor-results');
        if (!container) return;
        const group = (label, arr) => `
 <div class="extract-group">
 <h4>${label} (${arr.length})</h4>
 ${arr.map(v => {
            const safeValue = escapeHtml(v);
            return `<label class="extract-item"><input type=\"checkbox\" value=\"${safeValue}\" checked> <span>${safeValue}</span></label>`;
        }).join('')}
 </div>`;
        container.innerHTML = [
            group('Companies', data.companies),
            group('Emails', data.emails),
            group('Phone numbers', data.phones),
            group('Links', data.urls)
        ].join('');
    }
};

// ============================================
// THEME SWITCHER
// ============================================
const Theme = {
    init() {
        const toggleBtn = document.querySelector('[data-action="toggle-theme"]');
        toggleBtn?.addEventListener('click', () => {
            const current = document.body.dataset.theme;
            const next = current === 'dark' ? 'light' : 'dark';
            document.body.dataset.theme = next;
            localStorage.setItem('theme', next);
            toggleBtn.setAttribute('data-theme-active', 'true');
            setTimeout(() => toggleBtn.removeAttribute('data-theme-active'), 300);
            Toast.show(`Switched to ${next} theme`, 'success');
        });

        const saved = localStorage.getItem('theme') || 'dark';
        document.body.dataset.theme = saved;
    }
};

// ============================================
// ADVANCED SETTINGS & CUSTOMIZATION
// ============================================
const AdvancedSettings = {
    THEME_PRESETS: {
        purple: { hue: 258, saturation: 85, lightness: 65 },
        blue: { hue: 210, saturation: 80, lightness: 60 },
        green: { hue: 150, saturation: 70, lightness: 50 },
        orange: { hue: 25, saturation: 90, lightness: 60 },
        pink: { hue: 330, saturation: 80, lightness: 65 },
        cyan: { hue: 180, saturation: 75, lightness: 55 },
        red: { hue: 0, saturation: 80, lightness: 60 },
        yellow: { hue: 50, saturation: 90, lightness: 60 }
    },

    init() {
        this.loadSettings();
        this.bindSettingsUI();
        this.applyThemeFromSettings();
        this.updateStorageSnapshot();
    },

    loadSettings() {
        const settings = State.get('settings') || { theme: { hue: 258, saturation: 85, lightness: 65 }, quickEditMode: false, autosave: true, compactMode: false };

        // Apply compact mode
        if (settings.compactMode) {
            document.body.classList.add('compact-mode');
        }

        // Apply quick edit mode
        if (settings.quickEditMode) {
            this.toggleQuickEditMode(true);
        }

        // Set UI values
        const hueEl = document.getElementById('theme-hue');
        const satEl = document.getElementById('theme-saturation');
        const lightEl = document.getElementById('theme-lightness');
        const hueValEl = document.getElementById('hue-value');
        const satValEl = document.getElementById('sat-value');
        const lightValEl = document.getElementById('light-value');
        const quickEditEl = document.getElementById('quick-edit-mode');
        const autosaveEl = document.getElementById('setting-autosave');
        const compactEl = document.getElementById('compact-mode');

        const theme = settings.theme || { hue: 258, saturation: 85, lightness: 65 };
        if (hueEl) hueEl.value = theme.hue;
        if (satEl) satEl.value = theme.saturation;
        if (lightEl) lightEl.value = theme.lightness;
        if (hueValEl) hueValEl.textContent = theme.hue + '°';
        if (satValEl) satValEl.textContent = theme.saturation + '%';
        if (lightValEl) lightValEl.textContent = theme.lightness + '%';
        if (quickEditEl) quickEditEl.checked = settings.quickEditMode;
        if (autosaveEl) autosaveEl.checked = settings.autosave;
        if (compactEl) compactEl.checked = settings.compactMode;

        return settings;
    },

    bindSettingsUI() {
        const hueInput = document.getElementById('theme-hue');
        const satInput = document.getElementById('theme-saturation');
        const lightInput = document.getElementById('theme-lightness');

        hueInput?.addEventListener('input', (e) => {
            this.updateThemeValue('hue', e.target.value);
            document.getElementById('hue-value').textContent = e.target.value + '°';
            this.saveThemeSettings();
        });

        satInput?.addEventListener('input', (e) => {
            this.updateThemeValue('saturation', e.target.value);
            document.getElementById('sat-value').textContent = e.target.value + '%';
            this.saveThemeSettings();
        });

        lightInput?.addEventListener('input', (e) => {
            this.updateThemeValue('lightness', e.target.value);
            document.getElementById('light-value').textContent = e.target.value + '%';
            this.saveThemeSettings();
        });

        document.getElementById('quick-edit-mode')?.addEventListener('change', (e) => {
            this.toggleQuickEditMode(e.target.checked);
            this.saveSettings({ quickEditMode: e.target.checked });
            Toast.show(`Quick Edit ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
        });

        document.getElementById('setting-autosave')?.addEventListener('change', (e) => {
            this.saveSettings({ autosave: e.target.checked });
            Toast.show(`Auto-save ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
        });

        document.getElementById('compact-mode')?.addEventListener('change', (e) => {
            document.body.classList.toggle('compact-mode', e.target.checked);
            this.saveSettings({ compactMode: e.target.checked });
            Toast.show(`Compact Mode ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
        });

        document.querySelector('[data-action="export-settings"]')?.addEventListener('click', () => {
            this.exportSettings();
        });

        document.querySelector('[data-action="import-settings"]')?.addEventListener('click', () => {
            this.importSettings();
        });

        document.querySelector('[data-action="export-backup"]')?.addEventListener('click', () => {
            this.exportBackup();
        });

        document.querySelector('[data-action="import-backup"]')?.addEventListener('click', () => {
            this.importBackup();
        });

        document.querySelector('[data-action="reset-data"]')?.addEventListener('click', () => {
            this.resetAllData();
        });

        document.querySelector('[data-action="reset-theme"]')?.addEventListener('click', () => {
            if (confirm('Reset theme to default purple?')) {
                this.applyPreset(this.THEME_PRESETS.purple);
                Toast.show('Theme reset to default', 'success');
            }
        });
    },

    updateThemeValue(property, value) {
        const val = property === 'hue' ? value : value + (property === 'saturation' || property === 'lightness' ? '%' : '');
        document.documentElement.style.setProperty(`--theme-${property}`, val);
    },

    saveThemeSettings() {
        const hueEl = document.getElementById('theme-hue');
        const satEl = document.getElementById('theme-saturation');
        const lightEl = document.getElementById('theme-lightness');

        if (!hueEl || !satEl || !lightEl) return;

        const hue = parseInt(hueEl.value, 10);
        const saturation = parseInt(satEl.value, 10);
        const lightness = parseInt(lightEl.value, 10);

        this.saveSettings({
            theme: { hue, saturation, lightness }
        });
    },

    saveSettings(updates) {
        const currentSettings = State.get('settings');
        State.set('settings', { ...currentSettings, ...updates });
    },

    applyThemeFromSettings() {
        const settings = State.get('settings') || {};
        const theme = settings.theme || { hue: 258, saturation: 85, lightness: 65 };

        this.updateThemeValue('hue', theme.hue);
        this.updateThemeValue('saturation', theme.saturation);
        this.updateThemeValue('lightness', theme.lightness);
    },

    applyPreset(preset) {
        const hueEl = document.getElementById('theme-hue');
        const satEl = document.getElementById('theme-saturation');
        const lightEl = document.getElementById('theme-lightness');
        const hueValEl = document.getElementById('hue-value');
        const satValEl = document.getElementById('sat-value');
        const lightValEl = document.getElementById('light-value');

        if (hueEl) hueEl.value = preset.hue;
        if (satEl) satEl.value = preset.saturation;
        if (lightEl) lightEl.value = preset.lightness;
        if (hueValEl) hueValEl.textContent = preset.hue + '°';
        if (satValEl) satValEl.textContent = preset.saturation + '%';
        if (lightValEl) lightValEl.textContent = preset.lightness + '%';

        this.updateThemeValue('hue', preset.hue);
        this.updateThemeValue('saturation', preset.saturation);
        this.updateThemeValue('lightness', preset.lightness);

        this.saveThemeSettings();
    },

    toggleQuickEditMode(enabled) {
        document.body.classList.toggle('quick-edit-mode', enabled);
        // Implementation for quick edit would go here
    },

    updateStorageSnapshot() {
        document.getElementById('storage-apps').textContent = State.get('applications').length;
        document.getElementById('storage-letters').textContent = State.get('letters').length;
        document.getElementById('storage-events').textContent = State.get('events').length;

        const dataStr = localStorage.getItem('tooler-v6-state');
        const sizeKB = dataStr ? (new Blob([dataStr]).size / 1024).toFixed(2) : '0';
        document.getElementById('storage-size').textContent = sizeKB + ' KB';
    },

    exportSettings() {
        const settings = State.get('settings');
        const dataStr = JSON.stringify(settings, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `tooler-settings-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
        Toast.show('Settings exported', 'success');
    },

    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const settings = JSON.parse(text);

                State.set('settings', settings);
                this.loadSettings();
                this.applyThemeFromSettings();

                Toast.show('Settings imported successfully', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                console.error('Import error:', error);
                Toast.show('Failed to import settings', 'error');
            }
        });

        input.click();
    },

    exportBackup() {
        const snapshot = {};
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            snapshot[key] = localStorage.getItem(key);
        }

        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: snapshot
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tooler-backup-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        Toast.show('Backup exported', 'success');
    },

    importBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;

                Object.entries(data).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        localStorage.setItem(key, value);
                    } else {
                        localStorage.setItem(key, JSON.stringify(value));
                    }
                });

                Toast.show('Backup imported. Reloading...', 'success');
                setTimeout(() => location.reload(), 800);
            } catch (error) {
                console.error('[AdvancedSettings] Import backup failed', error);
                Toast.show('Failed to import backup', 'error');
            }
        });

        input.click();
    },

    resetAllData() {
        if (!confirm('This will remove all stored data. Continue?')) return;

        const preserveTheme = localStorage.getItem('theme');
        localStorage.clear();
        if (preserveTheme) {
            localStorage.setItem('theme', preserveTheme);
        }

        Toast.show('All data cleared. Reloading...', 'warning');
        setTimeout(() => location.reload(), 800);
    }
};

// ============================================
// APPLICATION ACTIONS
// ============================================
const Actions = {
    init() {
        document.querySelectorAll('[data-action="new-application"]').forEach(btn => {
            btn.addEventListener('click', () => this.newApplication());
        });

        document.querySelectorAll('[data-action="open-tracker"]').forEach(btn => {
            btn.addEventListener('click', () => {
                Router.navigate?.('tracker');
                setTimeout(() => JobTracker.init(), 100);
            });
        });

        document.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            if (window.electronAPI?.closeWindow) {
                window.electronAPI.closeWindow();
            } else {
                window.close();
            }
        });
    },

    newApplication() {
        const company = prompt('Company name:');
        if (!company) return;

        const role = prompt('Role:');
        if (!role) return;

        const newApp = {
            id: Date.now().toString(),
            company,
            role,
            status: 'draft',
            salary: '',
            date: new Date().toISOString()
        };

        State.add('applications', newApp);
        Toast.show('Application created', 'success');

        if (Router.currentView === 'kanban' && KanbanBoard.board) {
            KanbanBoard.board.dataSource = State.get('applications').map(app => ({
                Id: app.id,
                Title: app.role,
                Status: app.status,
                Summary: app.company,
                Tags: app.salary,
                Priority: 'Normal'
            }));
        }
    }
};

// ============================================
// APPLICATIONS PANEL (Workspace view)
// ============================================
const ApplicationsPanel = {
    showArchived: false,
    grid: null,
    searchInput: null,
    statusFilter: null,
    toggleArchivedBtn: null,

    init() {
        this.grid = document.getElementById('applications-grid');
        if (!this.grid) return;
        this.searchInput = document.getElementById('search-applications');
        this.statusFilter = document.getElementById('filter-status');
        this.toggleArchivedBtn = document.querySelector('[data-action="application-toggle-archived"]');
        this.bindEvents();
        this.render();
        State.on('applications', () => this.render());
    },

    bindEvents() {
        this.searchInput?.addEventListener('input', () => this.render());
        this.statusFilter?.addEventListener('change', () => this.render());
        this.toggleArchivedBtn?.addEventListener('click', () => {
            this.showArchived = !this.showArchived;
            this.toggleArchivedBtn.textContent = this.showArchived ? 'Hide archived' : 'Show archived';
            this.render();
        });

        this.grid.addEventListener('change', (event) => {
            if (event.target.matches('.application-status')) {
                this.updateStatus(event.target.dataset.id, event.target.value);
            }
        });

        this.grid.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            const id = target.dataset.id;
            if (!id) return;

            switch (target.dataset.action) {
                case 'application-open-kanban':
                    Router.navigate('kanban');
                    break;
                case 'application-archive':
                    this.toggleArchive(id);
                    break;
                case 'application-delete':
                    this.remove(id);
                    break;
                default:
                    break;
            }
        });
    },

    getApplications() {
        return Array.isArray(State.get('applications')) ? State.get('applications') : [];
    },

    render() {
        const apps = this.getApplications()
            .filter(app => (this.showArchived ? true : !app.archived))
            .filter(app => {
                const query = (this.searchInput?.value || '').toLowerCase();
                if (!query) return true;
                return `${app.company} ${app.role}`.toLowerCase().includes(query);
            })
            .filter(app => {
                const status = this.statusFilter?.value || '';
                if (!status) return true;
                return (app.status || 'draft') === status;
            })
            .sort((a, b) => new Date(b.date || b.createdDate || 0) - new Date(a.date || a.createdDate || 0));

        if (!apps.length) {
            this.grid.innerHTML = `
                <div class="empty-state">
                    <p>No applications match those filters yet.</p>
                </div>
            `;
            return;
        }

        this.grid.innerHTML = apps.map(app => this.renderCard(app)).join('');
    },

    renderCard(app) {
        const tags = [
            app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Draft',
            app.salary,
            app.archived ? 'Archived' : null
        ].filter(Boolean).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');

        return `
            <article class="application-card" data-id="${app.id}">
                <header>
                    <div>
                        <h3 class="application-title">${escapeHtml(app.role || 'Role TBD')} @ ${escapeHtml(app.company || 'Unknown')}</h3>
                        <span class="application-meta">Updated ${this.formatDate(app.date)}</span>
                    </div>
                    <select class="application-status" data-id="${app.id}">
                        ${['draft', 'applied', 'interview', 'offer', 'rejected'].map(status => `
                            <option value="${status}"${app.status === status ? ' selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>
                        `).join('')}
                    </select>
                </header>
                <div class="application-body">
                    ${app.notes ? `<div>${escapeHtml(app.notes)}</div>` : ''}
                    ${app.contact ? `<div>Contact: ${escapeHtml(app.contact)}</div>` : ''}
                    ${app.salary ? `<div>Compensation: ${escapeHtml(app.salary)}</div>` : ''}
                </div>
                <footer>
                    <div class="application-tags">${tags || '<span>In progress</span>'}</div>
                    <div class="application-actions">
                        <button class="btn btn--ghost btn--sm" data-action="application-open-kanban" data-id="${app.id}">Open board</button>
                        <button class="btn btn--ghost btn--sm" data-action="application-archive" data-id="${app.id}">
                            ${app.archived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button class="btn btn--ghost btn--sm" data-action="application-delete" data-id="${app.id}">Delete</button>
                    </div>
                </footer>
            </article>
        `;
    },

    formatDate(value) {
        if (!value) return 'No date';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'No date';
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    },

    updateStatus(id, status) {
        if (!id) return;
        State.update('applications', id, { status, date: new Date().toISOString() });
        Toast.show(`Status updated to ${status}`, 'success');
    },

    toggleArchive(id) {
        const app = this.getApplications().find(item => item.id === id);
        if (!app) return;
        State.update('applications', id, { archived: !app.archived, date: new Date().toISOString() });
        Toast.show(app.archived ? 'Moved back to active' : 'Archived', 'info');
    },

    remove(id) {
        if (!confirm('Delete this application?')) return;
        State.delete('applications', id);
        Toast.show('Application removed', 'warning');
    }
};

// ============================================
// DOCUMENT LIBRARY - SIMPLE CARD-BASED
// ============================================
const Library = {
    templates: [],
    presets: [],
    eventsAttached: false,
    templateInputAttached: false,

    init() {
        this.loadTemplates();
        this.loadPresets();
        this.render();
        this.setupTemplateInput();
        if (!this.eventsAttached) {
            this.attachEvents();
            this.eventsAttached = true;
        }
        PdfStudio.renderSidebarTemplates?.(this.templates);
    },

    loadTemplates() {
        // Load templates from localStorage
        const saved = localStorage.getItem('tooler-templates');
        const defaults = [
            { id: '1', name: 'Modern CV Template', type: 'cv' },
            { id: '2', name: 'Professional Cover Letter', type: 'letter' }
        ];

        const parsed = saved ? JSON.parse(saved) : defaults;
        this.templates = parsed.map((template, index) => ({
            id: template.id || (crypto?.randomUUID ? crypto.randomUUID() : `tpl-${index}`),
            name: template.name || 'Untitled Template',
            type: (template.type || 'other').toLowerCase(),
            data: template.data || null,
            size: template.size || null,
            uploadedAt: template.uploadedAt || new Date().toISOString()
        }));
    },

    loadPresets() {
        // Load presets from localStorage
        const saved = localStorage.getItem('tooler-presets');
        this.presets = saved ? JSON.parse(saved) : [
            {
                id: '1',
                name: 'Professional Opening',
                type: 'opening',
                content: 'I am writing to express my strong interest in the [Position] role at [Company]. With my background in [Field] and proven track record of [Achievement], I am confident I would be a valuable addition to your team.'
            },
            {
                id: '2',
                name: 'Enthusiastic Opening',
                type: 'opening',
                content: 'I was thrilled to discover the [Position] opening at [Company]. As someone who has long admired [Company]\'s work in [Area], I am excited about the opportunity to contribute my skills and experience to your innovative team.'
            },
            {
                id: '3',
                name: 'Experience Highlight',
                type: 'body',
                content: 'In my previous role at [Previous Company], I successfully [Achievement with metrics]. This experience has equipped me with [Skills] that directly align with the requirements outlined in your job description.'
            },
            {
                id: '4',
                name: 'Skills Match',
                type: 'body',
                content: 'My expertise in [Skill 1], [Skill 2], and [Skill 3] makes me particularly well-suited for this position. I have consistently applied these skills to [Specific outcome or project type], resulting in [Measurable impact].'
            },
            {
                id: '5',
                name: 'Company Alignment',
                type: 'body',
                content: 'I am particularly drawn to [Company]\'s commitment to [Company value or initiative]. My own professional philosophy centers on [Related personal value], and I would be excited to contribute to [Specific company goal or project].'
            },
            {
                id: '6',
                name: 'Professional Closing',
                type: 'closing',
                content: 'Thank you for considering my application. I would welcome the opportunity to discuss how my skills and experience align with your needs. I look forward to hearing from you.'
            },
            {
                id: '7',
                name: 'Eager Closing',
                type: 'closing',
                content: 'I am excited about the possibility of joining [Company] and contributing to [Specific team or initiative]. I would be delighted to discuss my qualifications further in an interview. Thank you for your time and consideration.'
            },
            {
                id: '8',
                name: 'Full Name Block',
                type: 'name',
                content: 'John Smith\\n123 Main Street\\nCity, State 12345\\nphone@email.com\\n(555) 123-4567'
            },
            {
                id: '9',
                name: 'Company Address',
                type: 'company',
                content: '[Hiring Manager Name]\\n[Title]\\n[Company Name]\\n[Address]\\n[City, State ZIP]'
            }
        ];
    },

    render() {
        const container = document.querySelector('#library-content');
        if (!container) return;

        container.innerHTML = `
      <div class="library-header">
        <h3>Document Library</h3>
        <div class="library-search">
          <input type="text" id="library-search-input" placeholder="Search library..." class="input">
        </div>
        <div class="library-tabs">
          <button class="tab-btn active" data-tab="templates">Templates</button>
          <button class="tab-btn" data-tab="presets">Text Presets</button>
        </div>
      </div>

      <div class="library-section active" data-section="templates">
        <div class="library-actions">
          <button class="btn btn--primary" id="upload-template-btn">
            <span>+ Upload Template</span>
          </button>
        </div>
        <div class="library-grid" id="templates-grid">
          ${this.templates.length > 0 ? this.templates.map(t => this.renderTemplateCard(t)).join('') : '<p class="empty-state">No templates yet. Upload one to get started!</p>'}
        </div>
      </div>

      <div class="library-section" data-section="presets">
        <div class="library-actions">
          <button class="btn btn--primary" id="create-preset-btn">
            <span>+ Create Preset</span>
          </button>
        </div>
        <div class="presets-list">
          ${this.presets.length > 0 ? this.presets.map(p => this.renderPresetItem(p)).join('') : '<p class="empty-state">No presets yet. Create one to reuse text snippets!</p>'}
        </div>
      </div>
    `;

        PdfStudio.renderSidebarTemplates?.(this.templates);
    },

    renderTemplateCard(template) {
        const name = escapeHtml(template.name || 'Untitled Template');
        const typeLabel = escapeHtml(this.formatTemplateType(template.type));
        return `
      <div class="template-card" data-id="${template.id}">
        <div class="template-preview">
          <svg class="icon icon--xl"><use href="#icon-pdf"></use></svg>
        </div>
        <div class="template-info">
          <h4>${name}</h4>
          <span class="template-type">${typeLabel}</span>
        </div>
        <div class="template-actions">
          <button class="btn btn--sm" data-action="use-template" data-id="${template.id}">Use</button>
          <button class="btn btn--sm btn--danger" data-action="delete-template" data-id="${template.id}">Delete</button>
        </div>
      </div>
    `;
    },

    renderPresetItem(preset) {
        const name = escapeHtml(preset.name);
        const type = escapeHtml(preset.type);
        const content = escapeHtml(preset.content);
        return `
      <div class="preset-item" data-id="${preset.id}">
        <div class="preset-header">
          <h4>${name}</h4>
          <span class="preset-type-badge">${type}</span>
        </div>
        <p class="preset-content">${content}</p>
        <div class="preset-actions">
          <button class="btn btn--sm" data-action="edit-preset" data-id="${preset.id}">Edit</button>
          <button class="btn btn--sm" data-action="copy-preset" data-id="${preset.id}">Copy</button>
          <button class="btn btn--sm btn--danger" data-action="delete-preset" data-id="${preset.id}">Delete</button>
        </div>
      </div>
    `;
    },

    setupTemplateInput() {
        if (this.templateInputAttached) return;
        const input = document.getElementById('template-file-input');
        if (!input) return;

        input.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            if (file.type !== 'application/pdf') {
                Toast.show('Please choose a PDF file', 'warning');
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const dataUrl = loadEvent.target?.result;
                if (!dataUrl) {
                    Toast.show('Failed to read file contents', 'error');
                    input.value = '';
                    return;
                }
                const base64 = dataUrl.toString().split(',')[1];
                this.promptTemplateMeta(file, base64, input);
            };
            reader.onerror = () => {
                Toast.show('Failed to read file', 'error');
                input.value = '';
            };
            reader.readAsDataURL(file);
        });

        this.templateInputAttached = true;
    },

    promptTemplateMeta(file, base64, input) {
        const defaultName = file.name.replace(/\.pdf$/i, '');
        const modal = Modal.create(`
      <div class="modal-content">
        <h3>Save Template</h3>
        <div class="form-group">
          <label>Template Name</label>
          <input type="text" id="template-name" class="input" value="${escapeHtml(defaultName)}" />
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="template-type" class="input">
            <option value="cv">CV / Resume</option>
            <option value="letter">Cover Letter</option>
            <option value="cover">Work Cover</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn" id="template-cancel">Cancel</button>
          <button class="btn btn--primary" id="template-save">Save Template</button>
        </div>
      </div>
    `);

        const closeModal = () => {
            Modal.close(modal);
            if (input) input.value = '';
        };

        modal.querySelector('#template-cancel').onclick = closeModal;
        modal.querySelector('#template-save').onclick = () => {
            const name = modal.querySelector('#template-name').value.trim() || defaultName;
            const type = modal.querySelector('#template-type').value;

            const template = {
                id: crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                name,
                type,
                data: base64,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };

            this.templates = [template, ...this.templates];
            this.persistTemplates();
            this.render();
            Toast.show('Template saved', 'success');
            closeModal();
        };
    },

    persistTemplates() {
        try {
            localStorage.setItem('tooler-templates', JSON.stringify(this.templates));
        } catch (error) {
            console.error('[Library] Failed to persist templates:', error);
            Toast.show('Unable to save templates. Storage may be full.', 'error');
        }
        PdfStudio.renderSidebarTemplates?.(this.templates);
    },

    formatTemplateType(type = 'template') {
        const label = `${type}`.toLowerCase();
        switch (label) {
            case 'cv':
                return 'CV Template';
            case 'letter':
                return 'Cover Letter';
            case 'cover':
                return 'Work Cover';
            case 'other':
                return 'General';
            default:
                return label.charAt(0).toUpperCase() + label.slice(1);
        }
    },

    attachEvents() {
        // Use event delegation on #library-content for ALL interactions
        const libraryContainer = document.querySelector('#library-content');
        if (!libraryContainer) return;

        // Search functionality
        libraryContainer.addEventListener('input', (e) => {
            if (e.target.id === 'library-search-input') {
                const query = e.target.value.toLowerCase();

                // Filter templates
                document.querySelectorAll('#templates-grid .template-card').forEach(card => {
                    const name = card.querySelector('h4')?.textContent.toLowerCase() || '';
                    card.style.display = name.includes(query) ? '' : 'none';
                });

                // Filter presets
                document.querySelectorAll('.presets-list .preset-item').forEach(item => {
                    const name = item.querySelector('h4')?.textContent.toLowerCase() || '';
                    const content = item.querySelector('.preset-content')?.textContent.toLowerCase() || '';
                    item.style.display = (name.includes(query) || content.includes(query)) ? '' : 'none';
                });
            }
        });

        // Tab switching with delegation
        libraryContainer.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const tab = tabBtn.dataset.tab;
                document.querySelectorAll('.library-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.library-section').forEach(s => s.classList.remove('active'));
                tabBtn.classList.add('active');
                document.querySelector(`[data-section="${tab}"]`)?.classList.add('active');
                return;
            }

            // Handle all action buttons
            const actionEl = e.target.closest('[data-action]') || e.target.closest('#create-preset-btn') || e.target.closest('#upload-template-btn');
            if (!actionEl) return;

            const action = actionEl.dataset.action;
            const id = actionEl.dataset.id;

            if (action === 'create-preset' || actionEl.id === 'create-preset-btn') {
                this.showPresetModal();
            } else if (action === 'edit-preset') {
                this.editPreset(id);
            } else if (action === 'copy-preset') {
                this.copyPreset(id);
            } else if (action === 'delete-preset') {
                this.deletePreset(id);
            } else if (action === 'use-template') {
                this.useTemplate(id);
            } else if (action === 'delete-template') {
                this.deleteTemplate(id);
            } else if (action === 'upload-template' || actionEl.id === 'upload-template-btn') {
                document.getElementById('template-file-input')?.click();
            }
        });
    },

    showPresetModal() {
        const modal = Modal.create(`
      <div class="modal-content">
        <h3>Create Text Preset</h3>
        <div class="form-group">
          <label>Preset Name</label>
          <input type="text" id="preset-name" class="input" placeholder="e.g., Tech Opening" />
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="preset-type" class="input">
            <option value="opening">Opening Paragraph</option>
            <option value="body">Body Paragraph</option>
            <option value="closing">Closing Paragraph</option>
            <option value="name">Name Signature</option>
            <option value="company">Company Reference</option>
          </select>
        </div>
        <div class="form-group">
          <label>Content (Use {company}, {position}, {skills} as placeholders)</label>
          <textarea id="preset-content" class="input" rows="4"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn" id="cancel-preset">Cancel</button>
          <button class="btn btn--primary" id="save-preset">Save Preset</button>
        </div>
      </div>
    `);

        modal.querySelector('#cancel-preset').onclick = () => Modal.close(modal);
        modal.querySelector('#save-preset').onclick = () => {
            const name = modal.querySelector('#preset-name').value;
            const type = modal.querySelector('#preset-type').value;
            const content = modal.querySelector('#preset-content').value;

            if (name && content) {
                this.presets.push({
                    id: Date.now().toString(),
                    name,
                    type,
                    content
                });
                localStorage.setItem('tooler-presets', JSON.stringify(this.presets));
                this.render();
                Modal.close(modal);
                Toast.show('Preset created!', 'success');
            }
        };
    },

    copyPreset(id) {
        const preset = this.presets.find(p => p.id === id);
        if (preset) {
            navigator.clipboard.writeText(preset.content);
            Toast.show('Preset copied to clipboard', 'success');
        }
    },

    deletePreset(id) {
        if (confirm('Delete this preset?')) {
            this.presets = this.presets.filter(p => p.id !== id);
            localStorage.setItem('tooler-presets', JSON.stringify(this.presets));
            this.render();
            Toast.show('Preset deleted', 'success');
        }
    },

    editPreset(id) {
        const preset = this.presets.find(p => p.id === id);
        if (!preset) return;

        const modal = Modal.create(`
      <div class="modal-content">
        <h3>Edit Preset</h3>
        <div class="form-group">
          <label>Preset Name</label>
          <input type="text" id="preset-name" class="input" value="${preset.name}" />
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="preset-type" class="input">
            <option value="opening" ${preset.type === 'opening' ? 'selected' : ''}>Opening</option>
            <option value="body" ${preset.type === 'body' ? 'selected' : ''}>Body</option>
            <option value="closing" ${preset.type === 'closing' ? 'selected' : ''}>Closing</option>
            <option value="name" ${preset.type === 'name' ? 'selected' : ''}>Name</option>
            <option value="company" ${preset.type === 'company' ? 'selected' : ''}>Company</option>
          </select>
        </div>
        <div class="form-group">
          <label>Content</label>
          <textarea id="preset-content" class="input" rows="4">${preset.content}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn" id="cancel-preset">Cancel</button>
          <button class="btn btn--primary" id="save-preset">Save Changes</button>
        </div>
      </div>
    `);

        modal.querySelector('#cancel-preset').onclick = () => Modal.close(modal);
        modal.querySelector('#save-preset').onclick = () => {
            preset.name = modal.querySelector('#preset-name').value;
            preset.type = modal.querySelector('#preset-type').value;
            preset.content = modal.querySelector('#preset-content').value;
            localStorage.setItem('tooler-presets', JSON.stringify(this.presets));
            this.render();
            Modal.close(modal);
            Toast.show('Preset updated!', 'success');
        };
    },

    useTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;
        if (!template.data) {
            Toast.show('Template file is not stored. Upload it again to use.', 'warning');
            return;
        }

        Toast.show('Opening template in PDF Studio...', 'info');
        Router?.navigate?.('pdf-studio');
        setTimeout(() => PdfStudio.openTemplate(template), 160);
    },

    deleteTemplate(id) {
        if (confirm('Delete this template?')) {
            this.templates = this.templates.filter(t => t.id !== id);
            this.persistTemplates();
            this.render();
            Toast.show('Template deleted', 'success');
        }
    }
};

// ============================================
// COVER LETTERS MODULE
// ============================================
const Letters = {
    editor: null,
    currentLetter: null,

    init() {
        this.editor = new RichTextEditor({
            height: '500px',
            toolbarSettings: {
                items: [
                    'Bold', 'Italic', 'Underline', 'StrikeThrough',
                    'FontName', 'FontSize', 'FontColor', 'BackgroundColor',
                    'Formats', 'Alignments', 'OrderedList', 'UnorderedList',
                    'Indent', 'Outdent', 'CreateLink', 'Image',
                    'Undo', 'Redo'
                ]
            },
            placeholder: 'Start writing your cover letter...',
            change: () => {
                if (this.currentLetter) {
                    this.currentLetter.content = this.editor.value;
                }
            }
        });

        this.editor.appendTo('#rich-text-editor');
        this.addPresetToolbarButton();
        this.renderLettersList();
        this.renderModularPresets();

        document.querySelector('[data-action="letter-new"]')?.addEventListener('click', () => this.newLetter());
        document.querySelector('[data-action="letter-save"]')?.addEventListener('click', () => this.saveLetter());
        document.querySelector('[data-action="letter-copy"]')?.addEventListener('click', () => this.copyPlainText());
        document.querySelector('[data-action="letter-clean"]')?.addEventListener('click', () => this.cleanContent());

        State.on('letters', () => this.renderLettersList());
    },

    // Clean current editor content: normalize spaces, dashes, zero-width chars
    cleanContent() {
        if (!this.editor) return;
        const html = this.editor.value || '';
        const cleaned = this._cleanHtmlContent(html);
        if (cleaned !== html) {
            this.editor.value = cleaned;
            if (this.currentLetter) this.currentLetter.content = cleaned;
        }
        Toast.show('Text cleaned', 'success');
    },

    // Copy current content as plain text to clipboard
    async copyPlainText() {
        if (!this.editor) return;
        const html = this.editor.value || '';
        const div = document.createElement('div');
        div.innerHTML = html;
        let text = div.innerText || '';
        text = text
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\u00A0/g, ' ')
            .replace(/ {2,}/g, ' ')
            .replace(/\s+([,.;:!?])/g, '$1')
            .replace(/\s*--+\s*/g, ' — ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
            Toast.show('Copied letter text', 'success');
        } catch (err) {
            console.error('[Letters] Clipboard copy failed:', err);
            Toast.show('Could not copy to clipboard', 'error');
        }
    },

    // Internal: sanitize HTML text nodes while preserving markup
    _cleanHtmlContent(html) {
        const container = document.createElement('div');
        container.innerHTML = html;

        const isBlock = (node) => node && node.nodeType === 1 && /^(P|DIV|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE)$/i.test(node.tagName);

        const iter = document.createNodeIterator(container, NodeFilter.SHOW_TEXT);
        let node;
        // Walk all text nodes and normalize
        while ((node = iter.nextNode())) {
            let t = node.nodeValue || '';
            if (!t) continue;

            // Replace NBSP and zero-width
            t = t.replace(/\u00A0/g, ' ');
            t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');

            // Collapse multiple spaces
            t = t.replace(/ {2,}/g, ' ');

            // Remove extra spaces before punctuation
            t = t.replace(/\s+([,.;:!?])/g, '$1');

            // Normalize double dashes to em dash with surrounding spaces
            t = t.replace(/\s*--+\s*/g, ' — ');

            // If text is at the start of a block element, trim leading
            if ((!node.previousSibling || (node.previousSibling.nodeType === 3 && !node.previousSibling.nodeValue.trim())) && isBlock(node.parentNode)) {
                t = t.replace(/^\s+/, '');
            }
            // If text is at the end of a block element, trim trailing
            if ((!node.nextSibling || (node.nextSibling.nodeType === 3 && !node.nextSibling.nodeValue.trim())) && isBlock(node.parentNode)) {
                t = t.replace(/\s+$/, '');
            }

            node.nodeValue = t;
        }

        // Reduce excessive <br> stacks
        let result = container.innerHTML.replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*){2,}/gi, '<br>');
        return result;
    },

    addPresetToolbarButton() {
        const presets = JSON.parse(localStorage.getItem('tooler-presets') || '[]');
        if (presets.length === 0) return;

        setTimeout(() => {
            const toolbar = document.querySelector('.e-rte-toolbar');
            if (!toolbar) return;

            (document.createElement('button')).className = 'e-tbar-btn e-control e-btn';
            (document.createElement('button')).innerHTML = '<span class="e-btn-icon e-icons e-list-unordered"></span><span>Quick Presets</span>';
            (document.createElement('button')).title = 'Insert preset text';
            (document.createElement('button')).style.cssText = 'margin-left: 8px; gap: 4px;';

            (document.createElement('button')).addEventListener('click', (e) => {
                e.preventDefault();
                this.showQuickPresetMenu(e.target);
            });

            toolbar.appendChild(document.createElement('button'));
        }, 500);
    },

    showQuickPresetMenu(buttonEl) {
        const presets = JSON.parse(localStorage.getItem('tooler-presets') || '[]');

        const menu = document.createElement('div');
        menu.className = 'preset-quick-menu';
        menu.style.cssText = `
      position: absolute;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 8px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 10000;
      min-width: 250px;
    `;

        menu.innerHTML = presets.map(p => `
      <button class="preset-menu-item" data-preset-id="${p.id}" style="
        display: block;
        width: 100%;
        padding: 8px 12px;
    border: none;
      background: transparent;
      text-align: left;
     cursor: pointer;
        border-radius: var(--radius-sm);
   margin-bottom: 4px;
        transition: background var(--transition-fast);
      ">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${p.name}</div>
      <div style="font-size: 11px; color: var(--color-text-muted);">${p.type}</div>
      </button>
    `).join('');

        menu.querySelectorAll('.preset-menu-item').forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                e.target.style.background = 'var(--color-surface-hover)';
            });
            item.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'transparent';
            });
            item.addEventListener('click', (e) => {
                const preset = presets.find(p => p.id === e.currentTarget.dataset.presetId);
                if (preset && this.editor) {
                    this.editor.executeCommand('insertHTML', preset.content + '<br><br>');
                    Toast.show(`Inserted ${preset.type} preset`, 'success');
                    menu.remove();
                }
            });
        });

        const rect = buttonEl.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';
        document.body.appendChild(menu);

        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    },

    renderModularPresets() {
        const presetsContainer = document.getElementById('letter-slot-presets');
        if (!presetsContainer) return;

        const presets = JSON.parse(localStorage.getItem('tooler-presets') || '[]');

        presetsContainer.innerHTML = presets.map(preset => `
      <button class="preset-card" data-preset-id="${preset.id}" style="
        padding: 12px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
border-radius: var(--radius-md);
        cursor: pointer;
    text-align: left;
        transition: all var(--transition-fast);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 600; font-size: 13px;">${preset.name}</span>
     <span class="preset-type-badge" style="
   padding: 2px 8px;
   border-radius: var(--radius-sm);
            font-size: 11px;
font-weight: 600;
      background: var(--color-primary);
       color: white;
     ">${preset.type}</span>
        </div>
        <div style="font-size: 12px; color: var(--color-text-muted); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${preset.content}
        </div>
      </button>
    `).join('');

        presetsContainer.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const preset = presets.find(p => p.id === card.dataset.presetId);
                if (preset && this.editor) {
                    const currentContent = this.editor.value || '';
                    this.editor.value = currentContent + '\n\n' + preset.content;
                    Toast.show(`Inserted ${preset.type} preset`, 'success');
                }
            });
        });
    },

    newLetter() {
        const modal = Modal.create(`
          <div class="modal-content">
            <h3>New Letter</h3>
            <div class="form-group">
              <label for="new-letter-title">Title</label>
              <input id="new-letter-title" type="text" class="text-input" placeholder="Senior Designer at Acme" />
            </div>
            <div class="modal-actions">
              <button class="btn btn--ghost" data-modal-action="cancel">Cancel</button>
              <button class="btn btn--primary" data-modal-action="create">Create</button>
            </div>
          </div>
        `);
        const input = modal.querySelector('#new-letter-title');
        input?.focus();
        const close = () => Modal.close(modal);
        modal.querySelector('[data-modal-action="cancel"]')?.addEventListener('click', close);
        modal.querySelector('[data-modal-action="create"]')?.addEventListener('click', () => {
            const title = input?.value?.trim();
            if (!title) { Toast.show('Please enter a title', 'warning'); return; }
            const newLetter = {
                id: Date.now().toString(),
                title,
                content: '',
                type: 'cover',
                date: new Date().toISOString()
            };
            State.add('letters', newLetter);
            this.loadLetter(newLetter);
            Toast.show('New letter created', 'success');
            close();
        });
    },

    loadLetter(letter) {
        this.currentLetter = letter;
        const titleInput = document.getElementById('letter-title');
        if (titleInput) titleInput.value = letter.title;
        this.editor.value = letter.content;
    },

    saveLetter() {
        if (!this.currentLetter) {
            Toast.show('No letter selected', 'warning');
            return;
        }

        const titleInput = document.getElementById('letter-title');
        if (titleInput) {
            this.currentLetter.title = titleInput.value;
        }
        this.currentLetter.content = this.editor.value;

        State.update('letters', this.currentLetter.id, this.currentLetter);
        Toast.show('Letter saved successfully', 'success');
    },

    renderLettersList() {
        const listContainer = document.getElementById('letters-list');
        if (!listContainer) return;

        const letters = State.get('letters');

        listContainer.innerHTML = letters.map(letter => `
 <div class="letter-item" data-id="${letter.id}" style="
    padding: 12px;
   background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
     border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
      " onmouseover="this.style.background='var(--color-surface-hover)'" 
         onmouseout="this.style.background='var(--color-bg-elevated)'">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${letter.title}</div>
        <div style="font-size: 12px; color: var(--color-text-muted);">${new Date(letter.date).toLocaleDateString()}</div>
      </div>
    `).join('');

        listContainer.querySelectorAll('.letter-item').forEach(item => {
            item.addEventListener('click', () => {
                const letter = letters.find(l => l.id === item.dataset.id);
                if (letter) this.loadLetter(letter);
            });
        });
    }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ [Tooler Modern] DOM Ready');

    // Initialize Toast first (needed by other modules)
    Toast.init();

    Router.init();
    Theme.init();
    AdvancedSettings.init();
    Dashboard.init();
    Actions.init();
    ApplicationsPanel.init();

    const originalNavigate = Router.navigate;
    Router.navigate = function (viewName) {
        originalNavigate.call(this, viewName);

        if (viewName === 'kanban' && !KanbanBoard.board) {
            setTimeout(() => KanbanBoard.init(), 100);
        } else if (viewName === 'calendar' && !Calendar.scheduler) {
            setTimeout(() => Calendar.init(), 100);
        } else if (viewName === 'pdf-studio' && !PdfStudio.viewer) {
            setTimeout(() => PdfStudio.init(), 100);
        } else if (viewName === 'letters' && !Letters.editor) {
            setTimeout(() => Letters.init(), 100);
        } else if (viewName === 'library') {
            setTimeout(() => Library.init(), 100);
        } else if (viewName === 'tracker') {
            setTimeout(() => JobTracker.init(), 100);
        } else if (viewName === 'extractor') {
            setTimeout(() => Extractor.init(), 100);
        } else if (viewName === 'workspace') {
            setTimeout(() => WorkspaceCanvas.enter(), 100);
        } else if (viewName === 'settings') {
            AdvancedSettings.updateStorageSnapshot();
        }
    };

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S: Save current document
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            const currentView = Router.currentView;
            if (currentView === 'letters' && Letters.editor) {
                Letters.saveLetter();
            } else if (currentView === 'pdf-studio' && PdfStudio.viewer) {
                PdfStudio.exportPdf();
            }
        }

        // Ctrl+P: Print
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            const currentView = Router.currentView;
            if (currentView === 'pdf-studio' && PdfStudio.viewer) {
                PdfStudio.printPdf();
            }
        }

        // Ctrl+N: New document
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            Router.navigate('letters');
            Toast.show('New document started', 'info');
        }

        // ESC: Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => Modal.close(modal));
        }
    });

    console.log('🎉 [Tooler Modern] Ready!');
    Toast.show('Welcome to Tooler', 'success');
});

// Expose globals
window.State = State;
window.Router = Router;
window.Toast = Toast;
window.AdvancedSettings = AdvancedSettings;
window.PdfStudio = PdfStudio;
window.Extractor = Extractor;
window.JobTracker = JobTracker;
window.Letters = Letters;
window.WorkspaceCanvas = WorkspaceCanvas;
window.ApplicationsPanel = ApplicationsPanel;

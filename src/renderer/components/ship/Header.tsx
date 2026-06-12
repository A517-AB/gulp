export function Header() {
    return (
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-hover border border-hair flex items-center justify-center">
                <svg className="h-4 w-4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="#a855f7" />
                </svg>
            </div>
            <div>
                <h2 className="text-sm font-bold tracking-tight text-fg-primary uppercase">Ship</h2>
            </div>
        </div>
    );
}

export interface RestMediaArtifact {
    media: {
        data: string;
        format: string;
    };
}

export interface RestBashOutputArtifact {
    bashOutput: {
        command: string;
        stdout: string;
        stderr: string;
        exitCode: number | null;
    };
}

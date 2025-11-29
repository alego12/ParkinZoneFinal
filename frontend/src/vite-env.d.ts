/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_QR_PAYMENT_URL: string;
    readonly VITE_ROBOFLOW_API_KEY: string;
    readonly VITE_ROBOFLOW_WORKFLOW_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

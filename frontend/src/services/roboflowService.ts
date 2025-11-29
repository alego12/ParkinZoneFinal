class RoboflowService {
    private apiKey: string;
    private workflowUrl: string;

    constructor() {
        this.apiKey = import.meta.env.VITE_ROBOFLOW_API_KEY || '';
        this.workflowUrl = import.meta.env.VITE_ROBOFLOW_WORKFLOW_URL || '';
    }

    /**
     * Detecta y extrae el texto de una placa desde una imagen
     * @param imageData - Imagen en formato base64 o URL
     * @returns Texto de la placa detectada
     */
    async detectPlate(imageData: string): Promise<{
        plateText: string;
        confidence: number;
        rawResponse: any;
    }> {
        try {
            console.log('🔍 Enviando imagen a Roboflow...');
            console.log('📊 Tamaño de imagen (caracteres):', imageData.length);

            const response = await fetch(this.workflowUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    inputs: {
                        image: {
                            type: imageData.startsWith('http') ? 'url' : 'base64',
                            value: imageData
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Roboflow API error: ${response.statusText}`);
            }

            const result: any = await response.json();

            console.log('✅ Respuesta de Roboflow recibida:', result);

            // La respuesta de Roboflow workflows está anidada en outputs[0]
            const output = result.outputs?.[0];

            console.log('📦 Output extraído:', output);
            console.log('📝 Campo open_ai:', output?.open_ai);

            // Extraer el texto de la placa desde outputs[0].open_ai[0].output
            const plateText = output?.open_ai?.[0]?.output || '';

            console.log('🎯 Texto de placa extraído:', plateText);

            // Calcular confianza promedio de las detecciones
            const predictions = output?.predictions || [];
            const confidence = Array.isArray(predictions) && predictions.length > 0
                ? predictions.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0) / predictions.length
                : 0;

            console.log('📊 Confianza calculada:', confidence);

            return {
                plateText: plateText.trim(),
                confidence,
                rawResponse: result
            };
        } catch (error) {
            console.error('❌ Error detecting plate with Roboflow:', error);
            throw error;
        }
    }

    /**
     * Convierte un archivo de imagen a base64
     * @param file - Archivo de imagen
     * @returns Promise con la imagen en base64
     */
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remover el prefijo "data:image/...;base64,"
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Captura una imagen del canvas de video y la convierte a base64
     * @param videoElement - Elemento de video
     * @returns Imagen en formato base64 (sin prefijo data:image)
     */
    captureFromVideo(videoElement: HTMLVideoElement): string {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No se pudo obtener el contexto del canvas');
        }

        ctx.drawImage(videoElement, 0, 0);

        // Retornar solo la parte base64 (sin el prefijo data:image/jpeg;base64,)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        return dataUrl.split(',')[1];
    }
}

export const roboflowService = new RoboflowService();

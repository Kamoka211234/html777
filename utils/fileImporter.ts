import { FileSystemItem } from '../types';
import { generateId } from '../constants';

export const processFileImport = async (
    file: File, 
    parentId: string, 
    depth: number
): Promise<FileSystemItem> => {
    
    // Basic Client-Side "Compression" Logic
    // If it's a huge image, resize it. If it's a huge video, we can't do much in browser JS easily without ffmpeg.wasm
    // but we can ensure we store it as efficiently as possible.
    
    let content = '';
    let isBinary = false;
    let mimeType = file.type;

    if (file.type.startsWith('image/')) {
        content = await compressImage(file);
        isBinary = true;
    } else if (file.type.startsWith('text/') || file.name.endsWith('.js') || file.name.endsWith('.json') || file.name.endsWith('.css') || file.name.endsWith('.html')) {
        content = await readFileAsText(file);
        isBinary = false;
    } else {
        // Audio, Video, Fonts, PDF, etc.
        content = await readFileAsDataURL(file);
        isBinary = true;
    }

    return {
        id: generateId(),
        name: file.name,
        type: 'file',
        parentId,
        depth,
        content,
        isBinary,
        mimeType
    };
};

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Scale down logic: Max dimension 1200px to strictly limit size
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 1200;

                if (width > height) {
                    if (width > MAX_DIM) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    }
                } else {
                    if (height > MAX_DIM) {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG 0.7 quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};
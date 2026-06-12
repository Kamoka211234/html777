
import { FileSystemItem, Project, ObfuscationHistoryItem } from '../types';
import { createDbWorker } from './dbWorker';

const POOL_SIZE = 10;
const workers: Worker[] = [];
let nextWorkerIndex = 0;

const getWorker = () => {
    if (workers.length < POOL_SIZE) {
        const remaining = POOL_SIZE - workers.length;
        for (let i = 0; i < remaining; i++) {
            workers.push(createDbWorker());
        }
    }
    const selected = workers[nextWorkerIndex];
    nextWorkerIndex = (nextWorkerIndex + 1) % POOL_SIZE;
    return selected;
};

const request = (type: string, payload?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substr(2, 9);
        const w = getWorker();
        
        const handler = (e: MessageEvent) => {
            if (e.data.id === id) {
                w.removeEventListener('message', handler);
                if (e.data.success) {
                    resolve(e.data.result);
                } else {
                    reject(new Error(e.data.error));
                }
            }
        };
        
        w.addEventListener('message', handler);
        w.postMessage({ id, type, payload });
    });
};

export const db = {
  getProjects: (): Promise<Project[]> => request('getProjects'),
  createProject: (name: string, initialFiles?: FileSystemItem[]): Promise<string> => request('createProject', { name, initialFiles }),
  saveProjectFiles: (projectId: string, files: FileSystemItem[]): Promise<void> => request('saveProjectFiles', { projectId, files }),
  getProjectFiles: (projectId: string): Promise<FileSystemItem[]> => request('getProjectFiles', { projectId }),
  deleteProject: (projectId: string): Promise<void> => request('deleteProject', { projectId }),
  renameProject: (projectId: string, newName: string): Promise<void> => request('renameProject', { projectId, newName }),
  duplicateProject: (projectId: string): Promise<void> => request('duplicateProject', { projectId }),
  calculateProjectSize: (projectId: string): Promise<number> => request('calculateProjectSize', { projectId }),
  
  // Bookmarks
  saveBookmarks: (projectId: string, bookmarks: any[]): Promise<void> => request('saveBookmarks', { projectId, bookmarks }),
  getBookmarks: (projectId: string): Promise<any[]> => request('getBookmarks', { projectId }),
  
  // Obfuscation
  saveObfuscation: (original: string, obfuscated: string): Promise<void> => request('saveObfuscation', { original, obfuscated }),
  getObfuscationHistory: (): Promise<ObfuscationHistoryItem[]> => request('getObfuscationHistory'),
  clearObfuscationHistory: (): Promise<void> => request('clearObfuscationHistory'),
};

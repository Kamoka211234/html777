import { manifest as openInPhone } from './open-in-phone/manifest';
import { manifest as imagePreview } from './image-preview/manifest';
import { manifest as codePrettier } from './code-prettier/manifest';

export interface ExtensionManifest {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    usage?: string;
}

export const builtInExtensions: ExtensionManifest[] = [
    openInPhone,
    imagePreview,
    codePrettier
];


import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Info, CheckCircle, AlertTriangle, Box, FileJson, Settings2 } from 'lucide-react';

interface ConfigExplainerProps {
    fileName: string;
    content: string;
}

interface ExplanationItem {
    line: number;
    key: string;
    description: string;
    type?: 'info' | 'warning' | 'success';
}

const PACKAGE_JSON_DESC: Record<string, string> = {
    "name": "The unique identifier of your package.",
    "version": "Current version of the package (SemVer recommended).",
    "description": "Brief summary of what the package does.",
    "main": "The entry point file (usually index.js).",
    "scripts": "Custom CLI commands for building, testing, or running.",
    "dependencies": "Packages required to run this app in production.",
    "devDependencies": "Packages only needed for local development and testing.",
    "type": "Defines whether the package uses ES Modules ('module') or CommonJS ('commonjs').",
    "private": "If true, prevents accidental publishing to the npm registry.",
    "author": "The creator or maintainer of the project.",
    "license": "Defines how others can use or modify your code."
};

const TSCONFIG_DESC: Record<string, string> = {
    "target": "JavaScript version to compile down to (e.g., 'es2020', 'es5').",
    "module": "Determines the module system for the compiled output (e.g., 'commonjs', 'esnext').",
    "strict": "Enables all strict type-checking options for safer code.",
    "esModuleInterop": "Allows default imports from CommonJS modules.",
    "skipLibCheck": "Skips type checking of declaration files, speeding up builds.",
    "forceConsistentCasingInFileNames": "Ensures case sensitivity matches the OS.",
    "outDir": "The folder where compiled JavaScript files will be saved.",
    "rootDir": "The root folder containing your source TypeScript files.",
    "jsx": "How JSX syntax should be treated (e.g., 'react-jsx')."
};

export const ConfigExplainer: React.FC<ConfigExplainerProps> = ({ fileName, content }) => {
    const explanations = useMemo(() => {
        const items: ExplanationItem[] = [];
        const lines = content.split('\n');

        if (fileName === 'package.json') {
            try {
                const parsed = JSON.parse(content);
                lines.forEach((line, index) => {
                    const match = line.match(/"([^"]+)"\s*:/);
                    if (match && PACKAGE_JSON_DESC[match[1]]) {
                        items.push({
                            line: index + 1,
                            key: match[1],
                            description: PACKAGE_JSON_DESC[match[1]],
                            type: 'info'
                        });
                    }
                });
            } catch (e) {
                // Invalid JSON, skip parsing
            }
        } else if (fileName === 'tsconfig.json') {
            try {
                // Very naive JSON parsing (ignoring comments)
                lines.forEach((line, index) => {
                    const match = line.match(/"([^"]+)"\s*:/);
                    if (match && TSCONFIG_DESC[match[1]]) {
                        items.push({
                            line: index + 1,
                            key: match[1],
                            description: TSCONFIG_DESC[match[1]],
                            type: 'info'
                        });
                    }
                });
            } catch (e) {}
        } else if (fileName === '.env') {
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const parts = trimmed.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        let desc = "Environment Variable";
                        if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) desc = "Sensitive secret or API key. DO NOT commit this to public repositories.";
                        else if (key.includes('PORT')) desc = "Port number configuration for the server to listen on.";
                        else if (key.includes('URL') || key.includes('URI')) desc = "Connection URL or endpoint reference.";
                        else if (key.includes('NODE_ENV')) desc = "Defines the environment mode (e.g., 'development', 'production').";
                        items.push({
                            line: index + 1,
                            key: key,
                            description: desc,
                            type: desc.includes('Sensitive') ? 'warning' : 'info'
                        });
                    }
                }
            });
        } else if (fileName === 'Dockerfile' || fileName === 'dockerfile') {
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const args = trimmed.split(/\s+/);
                    const cmd = args[0].toUpperCase();
                    let desc = "";
                    if (cmd === 'FROM') desc = `Base image for your container. (${args[1] || 'Unknown image'})`;
                    else if (cmd === 'WORKDIR') desc = "Sets the working directory inside the container for subsequent commands.";
                    else if (cmd === 'COPY') desc = "Copies files or directories from your host into the container.";
                    else if (cmd === 'RUN') desc = "Executes a command during the build process (creating a new layer).";
                    else if (cmd === 'ENV') desc = "Sets an environment variable within the container.";
                    else if (cmd === 'EXPOSE') desc = "Documents the ports that the container listens on at runtime.";
                    else if (cmd === 'CMD') desc = "The default command to run when starting the container.";
                    else if (cmd === 'ENTRYPOINT') desc = "Configures the container to run as an executable.";

                    if (desc) {
                        items.push({
                            line: index + 1,
                            key: cmd,
                            description: desc,
                            type: 'info'
                        });
                    }
                }
            });
        }

        return items;
    }, [fileName, content]);

    if (explanations.length === 0) return null;

    let icon = <Settings2 size={16} className="text-gray-400" />;
    if (fileName.includes('json')) icon = <FileJson size={16} className="text-yellow-400" />;
    else if (fileName === '.env') icon = <AlertTriangle size={16} className="text-orange-400" />;
    else if (fileName.toLowerCase() === 'dockerfile') icon = <Box size={16} className="text-blue-400" />;

    return (
        <div className="w-[340px] h-full flex flex-col bg-[#1e1e1e] border-l border-[#333] shadow-[-4px_0_12px_rgba(0,0,0,0.1)] ml-auto z-10 shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#3e3e42] bg-[#252526]">
                {icon}
                <h3 className="text-sm font-semibold text-gray-200">Config Explainer</h3>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-3 space-y-3">
                <p className="text-xs text-gray-400 mb-2 font-mono bg-black/20 p-2 rounded border border-gray-800">
                    {fileName} breakdown
                </p>
                {explanations.map((item, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={`${item.line}-${item.key}-${idx}`} 
                        className={`p-3 rounded-lg border text-sm ${item.type === 'warning' ? 'bg-orange-900/10 border-orange-500/20 text-orange-200' : 'bg-[#2a2d2e] border-[#3e3e42] text-gray-300'}`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-black/30">
                                {item.key}
                            </span>
                            <span className="text-[10px] text-gray-500">Line {item.line}</span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90 mt-1.5">{item.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

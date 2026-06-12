import { format } from "prettier/standalone";
import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import * as html from "prettier/plugins/html";
import * as postcss from "prettier/plugins/postcss";

export const formatCode = async (code: string, language: string, tabSize: number = 4): Promise<string> => {
    const config: any = {
        tabWidth: tabSize,
        semi: true,
        singleQuote: false,
        trailingComma: "none",
        printWidth: 100,
    };

    switch (language.toLowerCase()) {
        case 'html':
            return await format(code, { ...config, parser: 'html', plugins: [html] });
        case 'css':
        case 'scss':
            return await format(code, { ...config, parser: 'css', plugins: [postcss] });
        case 'javascript':
        case 'js':
        case 'jsx':
        case 'typescript':
        case 'ts':
        case 'tsx':
            return await format(code, { 
                ...config, 
                parser: language.includes('ts') ? 'babel-ts' : 'babel', 
                plugins: [babel, estree] 
            });
        case 'json':
            return await format(code, { ...config, parser: 'json', plugins: [babel, estree] });
        default:
            return code;
    }
};
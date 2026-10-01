import fs from 'node:fs';
import ts from 'typescript';
import { literal } from './public/sprite-values.js';

// Compile only the trusted resolver implementation; edited data is supplied as inert literals.
const source=ts.createSourceFile('cardArtwork.ts',fs.readFileSync(new URL('../../src/models/cardArtwork.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
const resolver=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='resolveCardArtworkSource').getText(source).replace(/^export\s+/, '');
const code=ts.transpileModule(resolver,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
export const resolveCardArtworkSource=new Function('CARD_ARTWORK',code+';return resolveCardArtworkSource;')({});

export function validateCardArtworkReferences(model) {
    const node=model.declarations.find(d=>d.name==='CARD_ARTWORK')?.node,registry=literal(node)??{};
    return (node?.entries??[]).flatMap(entry=>{
        const result=resolveCardArtworkSource(entry.key,registry);
        return result.error ? [{file:model.file,line:model.source.slice(0,entry.node.start).split('\n').length,code:'CONFIG',message:result.error}] : [];
    });
}

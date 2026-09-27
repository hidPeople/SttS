const slash = value => String(value ?? '').replaceAll('\\', '/');
export function diagnosticFile(value, files) {
    const normalized = slash(value).replace(/^file:\/\//, '');
    return files.map(f => typeof f === 'string' ? f : f.file).find(file => normalized === file || normalized.endsWith('/' + file));
}
export function diagnosticLinks(log, diagnostics = [], files = []) {
    const results = diagnostics.map(d => ({ ...d, destination: diagnosticFile(d.file,files) }));
    const plain = log.replace(/\x1b\[[0-9;]*m/g, '');
    for (const line of plain.split(/\r?\n/)) {
        // tsc file(line,column), Vite file:line:column, or preflight file:line.
        const match = line.match(/((?:[A-Za-z]:)?[^\s()<>"']+\.(?:[cm]?[jt]sx?))(?:\((\d+),(\d+)\)|:(\d+)(?::(\d+))?)/);
        if (!match) {
            const normalized=slash(line);
            const file=files.map(f=>typeof f==='string'?f:f.file).find(file=>normalized.includes(file));
            if(file && !results.some(r=>r.destination===file)) results.push({file,destination:file,message:line.trim()});
            continue;
        }
        const [,file,a,b,c,d] = match;
        results.push({file:slash(file),line:Number(a??c),column:Number(b??d??1),message:line.trim(),destination:diagnosticFile(file,files)});
    }
    const seen=new Set();
    return results.filter(d=>{const key=(d.destination??d.file)+':'+d.line+':'+(d.column??1);if(seen.has(key))return false;seen.add(key);return true;});
}
export function diagnosticRange(source, diagnostic) {
    if (Number.isInteger(diagnostic.start)) {
        const start=Math.max(0,Math.min(source.length,diagnostic.start));
        return {start,end:Math.min(source.length,start+Math.max(1,diagnostic.length??1))};
    }
    const lines=source.split('\n'), index=Math.max(0,Math.min(lines.length-1,(diagnostic.line??1)-1));
    const start=lines.slice(0,index).reduce((n,line)=>n+line.length+1,0)+Math.max(0,Math.min(lines[index].replace(/\r$/,'').length,(diagnostic.column??1)-1));
    return {start,end:Math.min(source.length,start+1)};
}
export function diagnosticNode(model, range) {
    let best, bestSize=Infinity;
    const consider=(node,start=node.start,end=node.end)=>{if(start<=range.start&&end>=range.end&&end-start<bestSize){best=node;bestSize=end-start;}};
    const visit=n=>{if(!n)return;consider(n);
        for(const e of n.entries??[]){consider(e.node,e.start,e.end);visit(e.node);}
        for(const child of [...(n.args??[]),...(n.items??[]),...(n.inner?[n.inner]:[])])visit(child);
    };
    for(const d of model.declarations)visit(d.node);
    return best;
}

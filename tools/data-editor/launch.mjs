import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

// Keep the terminal alive; only the server child is replaced so updated modules are reloaded.
let child, restarting = false, stopping = false;
const input = createInterface({ input: process.stdin, terminal: false });
function start() {
    restarting = false;
    child = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url)), ...process.argv.slice(2)], {
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true,
    });
    child.on('error', error => console.error(`サーバー起動失敗: ${error.message}`));
    child.on('close', () => {
        child = undefined;
        if (stopping) input.close();
        else if (restarting) start();
        else console.log('サーバーは停止しています。rs + Enter で起動できます。');
    });
}
function stop() {
    if (stopping) return;
    stopping = true;
    if (child?.connected) child.send({type:'editor-shutdown'});
    else if (!child) input.close();
}
input.on('line', line => {
    const command = line.trim().toLowerCase();
    if (['exit', 'quit'].includes(command)) {stop();return;}
    if (!['rs', 'restart'].includes(command)) {
        if (command) console.log('再起動: rs + Enter / 終了: exit + Enter');
        return;
    }
    if (stopping || restarting) return;
    if (!child) {start();return;}
    restarting = true;
    console.log('処理の完了を待って再起動します。再起動後はブラウザを再読み込みしてください。');
    if (child.connected) child.send({type:'editor-shutdown'});
});
input.on('close', stop);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
console.log('再起動: rs（または restart）+ Enter / 終了: exit + Enter または Ctrl+C');
start();

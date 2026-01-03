import * as fs from 'fs';
import * as path from 'path';
import { parseNodeUrl } from '../lib/shared/parsers';

async function main() {
    const filePath = path.join(process.cwd(), 'lib/shared/test/test1.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());

    console.log(`Total URLs to test: ${lines.length}`);

    let successCount = 0;
    let failCount = 0;
    let errorMap: Record<string, number> = {};
    let protoFailMap: Record<string, number> = {};

    const fails: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        try {
            const node = parseNodeUrl(line);
            if (node) {
                successCount++;
            } else {
                failCount++;
                const proto = line.split('://')[0];
                protoFailMap[proto] = (protoFailMap[proto] || 0) + 1;

                // Detailed check for SS
                let reason = 'Unknown';
                if (line.startsWith('ss://')) {
                    const main = line.slice(5).split('#')[0];
                    if (!main.includes('@') && !/^[a-zA-Z0-9+/=_]+$/.test(main)) reason = 'Malformed';
                    else if (main.includes('@') && main.split('@')[1] === '') reason = 'Missing Host';
                    else if (!main.includes('@') && main.length < 10) reason = 'Too Short';
                    else reason = 'Parser rejected (Missing field?)';
                }

                if (fails.length < 20) fails.push(`[${reason}] ${line}`);
            }
        } catch (e: any) {
            failCount++;
            const proto = line.split('://')[0];
            protoFailMap[proto] = (protoFailMap[proto] || 0) + 1;
            const errorMsg = e.message || 'Unknown error';
            errorMap[errorMsg] = (errorMap[errorMsg] || 0) + 1;
            if (fails.length < 10) fails.push(`[ERROR: ${errorMsg}] ${line}`);
        }

        if ((i + 1) % 1000 === 0) {
            console.log(`Processed ${i + 1} URLs...`);
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Success: ${successCount}`);
    console.log(`Fail (returned null): ${failCount - Object.values(errorMap).reduce((a, b) => a + b, 0)}`);
    console.log(`Error (threw exception): ${Object.values(errorMap).reduce((a, b) => a + b, 0)}`);
    console.log('Error details:');
    console.log('Failures by protocol:');
    for (const [proto, count] of Object.entries(protoFailMap)) {
        console.log(` - ${proto}: ${count}`);
    }
    console.log('\n--- Failure Examples (First 10) ---');
    fails.forEach((f, idx) => console.log(`${idx + 1}: ${f}`));
}

main().catch(console.error);

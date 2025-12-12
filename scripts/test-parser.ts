
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SubscriptionParser } from '../lib/shared/subscription-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testParser() {
    console.log('__filename:', __filename);
    console.log('__dirname:', __dirname);
    const yamlPath = path.resolve(__dirname, '../test-source.yaml');
    console.log(`Reading file from: ${yamlPath}`);

    try {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        console.log(`File read successfully. Size: ${content.length} bytes.`);

        const parser = new SubscriptionParser();
        console.log('Parsing content...');

        const nodes = parser.parse(content);

        console.log(`\n--- Parse Result ---`);
        console.log(`Total nodes found: ${nodes.length}`);

        if (nodes.length > 0) {
            console.log('\nNodes list:');
            nodes.forEach((node, index) => {
                console.log(`${index + 1}. [${node.protocol}] ${node.name}`);
                console.log(`   URL: ${node.url}`);
            });
        } else {
            console.log('No nodes found!');
        }

        console.log('\n--- Testing Bug Reproduction (Leading Spaces) ---');
        // A valid vmess link but with leading spaces
        const buggyContent = '  vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogIuWLmeWKoOWIqSIsDQogICJhZGQiOiAiMTI3LjAuMC4xIiwNCiAgInBvcnQiOiAiODAiLA0KICAiaWQiOiAiYWFhYSIsDQogICJhaWQiOiAiMCIsDQogICJzY3kiOiAiYXV0byIsDQogICJuZXQiOiAidGNwIiwNCiAgInR5cGUiOiAibm9uZSIsDQogICJob3N0IjogIiIsDQogICJwYXRoIjogIiIsDQogICJ0bHMiOiAiIiwNCiAgInNuaSI6ICIiLA0KICAiYWxwbiI6ICIiLA0KICAiZnAiOiAiIg0KfQ==';
        const nodesBuggy = parser.parse(buggyContent);
        console.log(`Nodes found with leading spaces: ${nodesBuggy.length}`);
        if (nodesBuggy.length === 0) {
            console.log('FAIL: Parser failed to find node due to leading spaces.');
        } else {
            console.log('PASS: Parser handled leading spaces correctly.');
        }

    } catch (error) {
        console.error('Error during test:', error);
    }
}

testParser();

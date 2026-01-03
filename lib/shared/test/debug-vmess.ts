import { parseVmess } from '../parsers/vmess';

const url = 'vmess://eyJ2IjoiMiIsInBzIjoiVGVzdF9WTWVzcyIsImFkZCI6IjguOC44LjgiLCJwb3J0IjoiNDQzIiwiaWQiOiJ1dWlkLTIyMjIiLCJhaWQiOiIwIiwic2N5IjoiYXV0byIsIm5ldCI6IndzIiwidHlwZSI6Im5vbmUiLCJob3N0IjoiaG9zdC5jb20iLCJwYXRoIjoiL3BhdGgiLCJ0bHMiLCJ0bHMiLCJzbmkiOiJzbmkuY29tIn0=';

try {
    const node = parseVmess(url);
    console.log('Result:', node);
} catch (e) {
    console.error('Error:', e);
}

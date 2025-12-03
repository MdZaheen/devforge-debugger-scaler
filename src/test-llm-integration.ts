import { LocalLLMClient } from './llm/client';

async function test() {
    console.log('Testing LocalLLMClient with gemma3:1b...');
    const client = new LocalLLMClient('http://localhost:11434', 'gemma3:1b');
    try {
        const response = await client.generate('Write a hello world function in Python.');
        console.log('Response received:');
        console.log(response.content);
        console.log('Test Passed!');
    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
}

test();

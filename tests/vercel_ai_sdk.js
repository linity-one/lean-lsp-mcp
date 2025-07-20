import { experimental_createMCPClient, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
dotenv.config();

try {
  const client = await experimental_createMCPClient({
    transport: {
      type: 'sse',
      // url: "https://sagemath-mcp-79627762034.europe-west1.run.app/sse"
      url: "http://127.0.0.1:8000/sse"
    },
  });

  const tools = await client.tools();
  console.log("Tools being sent to Gemini:", JSON.stringify(tools, null, 2));

  const testCases = [
    {
      query: " Proof for any natural number is greater than 0. Get the best proof and print it out completely"
    }
  ];

  for (const { query } of testCases) {
    const response = await generateText({
      model: google('gemini-1.5-flash'),
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      tools,
      messages: [{ role: 'user', content: `${query}. The tools provided to you are good enough to handle all the queries -> including searching for theorems/proofs. Do not tell me that they aren't. At the very least try all the tools once. If you don't get any results(no results found), try another tool` }],
    });

    // console.log(response)
    let toolOutput = response.toolResults?.[0]?.result || response.text || 'No output';
    // console.log(toolOutput)
    let count = 0

    // Retry logic if there's an error
    // If the LLM uses the wrong tool, or doens't have all the necessary assumptions that need to be sent to sagemath
    // So that you get to know whether it's the server's fault or the LLM's fault.
    // Placed an upper limit of 5 retries, coz after that is just a skill issue. Write a better prompt (this was a problem so many times)/check your code.
    while (toolOutput.isError === true && count < 5){
      console.log("Error detected, retrying...")
      let resp = await generateText({
        model: google('gemini-1.5-flash'),
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        tools,
        messages: [{ role: 'user', content:
              `${query}, prev call: ${toolOutput.content[0].text}; 
              Read the error(last few lines), 
              think and pass in new assumptions as suggested by sage(actually pass them, not just "YOUR ASSUMPTIONS HERE"),
              and recall the tool accordingly` }],
      });

      toolOutput = resp.toolResults?.[0]?.result || resp.text || 'No output';
      count += 1
    }
    const formatted = {
      Query: query,
      Output: toolOutput,
      ToolCalled: response.toolResults.length > 0 ? response.toolResults[0].toolName : "Flopped no tool called"
    };

    console.log(JSON.stringify(formatted, null, 2));
  }

  client.close();
} catch (e) {
  console.log(e);
}
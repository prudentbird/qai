# FAQ AI Assistant

This is a simple Express.js application that serves as an AI assistant for Frequently Asked Questions, powered by Google Gemini. It includes an FAQ lookup mechanism to provide relevant answers based on predefined questions.

## Features

- Receives user prompts via a POST request.
- Uses the Google Gemini AI model via the AI SDK to generate responses.
- Integrates an FAQ middleware to check if the user's query matches predefined FAQs using embeddings and cosine similarity.
- Provides specific instructions to the AI model via a system prompt.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- AI SDK (`ai`, `@ai-sdk/google`)
- Dotenv (for environment variables)
- Zod (for schema validation in middleware)

## Prerequisites

- pnpm
- Node.js (v18 or later recommended)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/prudentbird/qai.git
    cd qai
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```

## Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
# Port the server will run on (default is 3000)
PORT=3000

# Your Google AI API Key (required for @ai-sdk/google)
# Obtain from Google AI Studio or Google Cloud Console
GOOGLE_GENERATIVE_AI_API_KEY=YOUR_GOOGLE_API_KEY

# Optional: Set the environment mode (e.g., development, production)
NODE_ENV=development
```

**Note:** Ensure your `.env` file is listed in your `.gitignore` file to prevent committing sensitive keys.

## Running the App

### Development Mode

```bash
npm run dev
```

### Production Mode

First, build the TypeScript code into JavaScript:

```bash
npm run build
```

Then, start the server using the compiled code:

```bash
npm start
```

The server will start on the port specified in your `.env` file (or 3000 if not set).

## API Endpoint

### `POST /q`

Sends a prompt to the AI assistant.

**Request Body:**

- `prompt` (string, required): The question or statement to send to the AI.

```json
{
  "prompt": "What is the capital of France?"
}
```

**Success Response (200 OK):**

- `text` (string): The AI-generated response.

```json
{
  "text": "The capital of France is Paris."
}
```

**Error Responses:**

- `400 Bad Request`: If the request body or `prompt` field is missing.
- `500 Internal Server Error`: If there's an error during AI generation or processing.

## Linting and Formatting

- **Lint:** Check the code for potential errors and style issues.
  ```bash
  npm run lint
  ```
- **Format:** Automatically format the code using Prettier.
  ```bash
  npm run format
  ```

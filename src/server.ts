import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { trySafe } from './helpers/try-safe';
import { generateText, wrapLanguageModel } from 'ai';
import express, { Request, Response } from 'express';
import { faqMiddleware } from './helpers/middleware';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/q', async (req: Request, res: Response) => {
  if (!req.body) {
    res.status(400).json({ error: 'Request body is required' });
    return;
  }

  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  const messages = [{ role: 'user' as const, content: prompt }];
  const model = wrapLanguageModel({
    model: google('gemini-2.0-flash-lite'),
    middleware: faqMiddleware,
  });

  const [error, result] = await trySafe(
    async () =>
      await generateText({
        model,
        messages,
        maxTokens: 8192,
        temperature: 0.7,
        providerOptions: {
          metadata: {
            faqs: {
              list: [
                {
                  question: 'What is the capital of France?',
                  answer: 'The capital of France is Paris.',
                },
              ],
            },
          },
        },
        system: `You are a helpful AI assistant for Frequently Asked Questions. Follow these guidelines:
- Be concise and to the point in all responses
- Do not include any other text than the answer to the question
- Do not respond to questions that are not related to the FAQs
- Only answer questions you're certain about, otherwise say "I don't know" and ask the user to contact support
- For further assistance, direct users to:
  • Contact page: https://yoursite.com/contact-us
  • Support email: support@yoursite.com`,
      }),
  );

  if (error) {
    res.status(500).json({ error: error.message ?? 'An unknown error occurred' });
    return;
  }

  res.status(200).json({ text: result.text });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(
    `Server is running on port ${process.env.PORT || 3000} in ${process.env.NODE_ENV} mode`,
  );
});

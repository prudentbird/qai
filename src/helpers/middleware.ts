import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { cosineSimilarity, embed, LanguageModelV1Middleware, generateObject } from 'ai';

const faqSchema = z.object({
  faqs: z.object({
    list: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    ),
  }),
});

interface FaqEntry {
  question: string;
  answer: string;
  embedding: number[];
}

let cachedFaqEmbeddings: { list: FaqEntry[]; originalFaqsJson: string } | null = null;

export const faqMiddleware: LanguageModelV1Middleware = {
  transformParams: async ({ params }) => {
    const { prompt: messages, providerMetadata } = params;

    const { success, data } = faqSchema.safeParse(providerMetadata?.metadata);

    if (!success || data.faqs.list.length === 0) {
      console.log('FAQ Middleware: No valid FAQs found in providerMetadata.');
      return params;
    }

    const providedFaqs = data.faqs.list;
    const providedFaqsJson = JSON.stringify(providedFaqs);

    const recentMessage = messages.pop();

    if (!recentMessage || recentMessage.role !== 'user') {
      if (recentMessage) {
        messages.push(recentMessage);
      }
      console.log('FAQ Middleware: No recent user message found.');
      return params;
    }

    const lastUserMessageContent = recentMessage.content
      .filter((content): content is { type: 'text'; text: string } => content.type === 'text')
      .map((content) => content.text)
      .join('\n');

    if (!lastUserMessageContent.trim()) {
      messages.push(recentMessage);
      console.log('FAQ Middleware: User message content is empty.');
      return params;
    }

    const { object: classification } = await generateObject({
      model: google('gemini-1.5-flash-8b'),
      schema: z.enum(['question', 'other']),
      system:
        'Classify the user message as a question or other. Consider the message a question if it directly asks something or seeks information.',
      prompt: lastUserMessageContent,
    });

    if (classification !== 'question') {
      messages.push(recentMessage);
      console.log(`FAQ Middleware: Classification is "${classification}", skipping FAQ lookup.`);
      return params;
    }

    console.log(`FAQ Middleware: Classification is "question", proceeding with FAQ lookup.`);

    const { embedding: userQuestionEmbedding } = await embed({
      model: google.textEmbeddingModel('text-embedding-004'),
      value: lastUserMessageContent,
    });

    let faqEmbeddings: FaqEntry[];
    if (cachedFaqEmbeddings && cachedFaqEmbeddings.originalFaqsJson === providedFaqsJson) {
      console.log('FAQ Middleware: Using cached FAQ embeddings.');
      faqEmbeddings = cachedFaqEmbeddings.list;
    } else {
      console.log('FAQ Middleware: Generating and caching FAQ embeddings.');
      faqEmbeddings = await Promise.all(
        providedFaqs.map(async (faq) => {
          const { embedding } = await embed({
            model: google.textEmbeddingModel('text-embedding-004'),
            value: faq.question,
          });
          return { ...faq, embedding };
        }),
      );
      cachedFaqEmbeddings = { list: faqEmbeddings, originalFaqsJson: providedFaqsJson };
    }

    const faqsWithSimilarity = faqEmbeddings.map((faq) => ({
      ...faq,
      similarity: cosineSimilarity(userQuestionEmbedding, faq.embedding),
    }));

    faqsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

    const similarityThreshold = 0.7;
    const bestFaq = faqsWithSimilarity[0];

    if (bestFaq && bestFaq.similarity > similarityThreshold) {
      console.log(
        `FAQ Middleware: Found relevant FAQ (Similarity: ${bestFaq.similarity.toFixed(2)}): "${bestFaq.question}"`,
      );
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Here is a potentially relevant FAQ that might help answer the user's question:\n\nQ: ${bestFaq.question}\nA: ${bestFaq.answer}\n\n---\n\nUser's question:`,
          },
          ...recentMessage.content,
        ],
      });
    } else {
      console.log(
        `FAQ Middleware: No relevant FAQ found above threshold (${similarityThreshold}). Max similarity: ${bestFaq?.similarity.toFixed(2) ?? 'N/A'}`,
      );
      messages.push(recentMessage);
    }

    return { ...params, prompt: messages };
  },
};

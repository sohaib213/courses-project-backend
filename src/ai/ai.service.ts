import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';

interface AiEssayResult {
  score: number;
  feedback: string;
  similarity: number;
}

@Injectable()
export class AiService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async gradeEssay(params: {
    questionText: string;
    modelAnswer: string;
    studentAnswer: string;
    maxScore: number;
  }): Promise<{
    score: number;
    feedback: string;
    similarity: number;
  }> {
    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `
              You are a strict but fair teacher.
              Grade student essay answers based on meaning, not wording.
              If the student answer is correct but phrased differently, give full marks.
              Respond ONLY in valid JSON.
            `,
          },
          {
            role: 'user',
            content: `
Question:
${params.questionText}

Model Answer:
${params.modelAnswer}

Student Answer:
${params.studentAnswer}

Max Score: ${params.maxScore}

Return JSON with:
{
  "score": number (0 to Max Score),
  "feedback": string,
  "similarity": number (0 to 100)
}
`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');

      return JSON.parse(content) as AiEssayResult;
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('AI grading failed');
    }
  }
}

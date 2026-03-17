import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ReferenceData {
  base64: string;
  mimeType: string;
}

export async function generateWordContent(prompt: string, language: string, referenceData?: ReferenceData, wordCount?: number, docType?: string) {
  const contents: any[] = [];
  if (referenceData) {
    contents.push({
      inlineData: {
        data: referenceData.base64,
        mimeType: referenceData.mimeType,
      },
    });
  }
  contents.push({
    text: `Write a comprehensive ${docType ? `"${docType}" document` : 'document'} about "${prompt}" in ${language}. ${wordCount ? `The document should be approximately ${wordCount} words long.` : ''} Use clear headings and paragraphs. Make it professional and detailed. Use markdown headings (# for H1, ## for H2, ### for H3) for structure, but do not use other markdown formatting like ** or *, just plain text with newlines for paragraphs.${referenceData ? ' Use the provided reference document as a template or context for the structure and content.' : ''}`,
  });

  const response = await ai.models.generateContent({
    model: referenceData ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview',
    contents,
  });
  return response.text;
}

export async function generatePPTContent(prompt: string, language: string, referenceData?: ReferenceData, slideCount?: number, category?: string, type?: string) {
  const contents: any[] = [];
  if (referenceData) {
    contents.push({
      inlineData: {
        data: referenceData.base64,
        mimeType: referenceData.mimeType,
      },
    });
  }
  
  let typePrompt = '';
  if (category && type) {
    typePrompt = ` The presentation should be a "${type}" in the "${category}" category.`;
  } else if (type) {
    typePrompt = ` The presentation should be a "${type}".`;
  }

  contents.push({
    text: `Create a presentation about "${prompt}" in ${language}.${typePrompt} ${slideCount ? `The presentation must contain exactly ${slideCount} slides.` : ''} Provide the content as a JSON array of slides. Each slide should have a 'title' (string) and 'bulletPoints' (array of strings).${referenceData ? ' Use the provided reference document as a template or context for the structure and content.' : ''}`,
  });

  const response = await ai.models.generateContent({
    model: referenceData ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview',
    contents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bulletPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['title', 'bulletPoints'],
        },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export async function generateExcelContent(prompt: string, language: string, referenceData?: ReferenceData, includeChart?: boolean) {
  const contents: any[] = [];
  if (referenceData) {
    contents.push({
      inlineData: {
        data: referenceData.base64,
        mimeType: referenceData.mimeType,
      },
    });
  }
  contents.push({
    text: `Generate a spreadsheet dataset about "${prompt}" in ${language}. ${includeChart ? 'Include data that is highly suitable for creating charts (e.g., time series, categories with numerical values).' : ''} Provide the content as a JSON array of arrays, where the first array contains the column headers, and subsequent arrays contain the row data. Ensure there are at least 5 rows and 3 columns.${referenceData ? ' Use the provided reference document as a template or context for the structure and content.' : ''}`,
  });

  const response = await ai.models.generateContent({
    model: referenceData ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview',
    contents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export async function extractTextFromImage(base64Data: string, mimeType: string, language: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      {
        text: `Extract all the text from this page exactly as it is. Preserve basic formatting like bold and italics by wrapping the text in <strong> and <em> HTML tags. Use <p> tags for paragraphs and <br> for line breaks. If the text is not in ${language}, translate it to ${language}. Return ONLY the HTML, without any markdown code blocks or commentary.`,
      },
    ],
  });
  return response.text?.replace(/```html/g, '').replace(/```/g, '').trim();
}

export async function translateWordContent(htmlContent: string, targetLanguage: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following HTML content into ${targetLanguage}. Preserve all HTML tags, structure, and formatting exactly as they are. Only translate the text content inside the tags. Return ONLY the translated HTML, without any markdown code blocks or commentary.\n\n${htmlContent}`,
  });
  return response.text?.replace(/```html/g, '').replace(/```/g, '').trim() || '';
}

export async function translatePPTContent(slides: any[], targetLanguage: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following presentation slides into ${targetLanguage}. Return the translated content as a JSON array of slides with the exact same structure ('title' and 'bulletPoints').\n\n${JSON.stringify(slides)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bulletPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['title', 'bulletPoints'],
        },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export async function translateExcelContent(data: string[][], targetLanguage: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following spreadsheet data into ${targetLanguage}. Return the translated content as a JSON array of arrays, preserving the exact same row and column structure.\n\n${JSON.stringify(data)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}


import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

/* Using gemini-3-pro-preview for complex technical reasoning tasks as per guidelines */
const MODEL_NAME = 'gemini-3-pro-preview';

/**
 * Answers questions about a specific PDF document using its extracted text.
 */
export const askAboutPdf = async (
  pdfContent: string,
  userQuestion: string,
  history: { role: 'user' | 'model'; text: string }[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Format history for the Gemini API
  const contents = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));
  
  // Append current user message
  contents.push({ role: 'user', parts: [{ text: userQuestion }] });

  const systemInstruction = `
    You are a Certified Senior Technical Auditor and Engineering Consultant specializing in GCC Design Codes (KSA, UAE, Qatar).
    Your objective is to extract and present information from PDF technical data in a highly organized, professional report format.

    ### CRITICAL: CITATION RULE
    The provided text context contains markers like [PAGE: 1] and [/PAGE: 1]. 
    Whenever you state a specific requirement, technical value, or code clause, you MUST append a citation in the format [PAGE N] at the end of the sentence (e.g., "The minimum load is 5kN [PAGE 12]"). 
    This allows the user to jump directly to the source.

    ### FORMATTING RULES (STRICT ADHERENCE):
    1. **Structure**: Start with a concise ### SUMMARY header.
    2. **Presentation**: Use **Markdown Tables** for all numerical values, codes, or comparisons.
    3. **Precision**: Use **Bold text** for specific codes (e.g., **SBC 301**) or critical safety values.
    4. **Directness**: Eliminate all conversational filler.
    5. **Sections**: Use clear headings like ### Technical Parameters, ### Regulatory Requirements, or ### Compliance Notes.
    6. **Tone**: Objective, authoritative, and professional engineering standard.

    ### CONTEXTUAL DATA:
    ${pdfContent.substring(0, 120000)}
    [END OF PDF DATA SOURCE]
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.1,
    },
  });

  return response.text || "Report generation failed. Please consult the raw document extract.";
};

/**
 * Searches across all uploaded files to find the best matching document and provide a global answer.
 */
export const globalAiSearch = async (
  files: any[],
  query: string
): Promise<{ bestFileIndex: number; answer: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const fileManifest = files.map((f, i) => 
    `Index: ${i} | Doc: ${f.name} | Territory: ${f.country} | Snippet: ${f.content.substring(0, 800)}`
  ).join('\n---\n');

  const response = await ai.models.generateContent({
    /* Using gemini-3-pro-preview for advanced reasoning across multiple documents */
    model: 'gemini-3-pro-preview',
    contents: [{
      role: 'user',
      parts: [{
        text: `Search query: "${query}"
        Analyze available engineering library:
        ${fileManifest}
        
        Identify the single most relevant document. Provide a professional, structured technical answer summarizing the findings. 
        Note: If you cite specifics, include [PAGE N] citations based on the snippets provided if markers are present.`
      }]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bestFileIndex: { type: Type.INTEGER },
          answer: { type: Type.STRING }
        },
        required: ["bestFileIndex", "answer"]
      }
    }
  });

  try {
    const text = response.text || "{}";
    const result = JSON.parse(text);
    return {
      bestFileIndex: typeof result.bestFileIndex === 'number' ? result.bestFileIndex : 0,
      answer: result.answer || "Cross-document analysis yielded no specific technical match."
    };
  } catch (e) {
    return { bestFileIndex: 0, answer: "Search engine analysis error." };
  }
};

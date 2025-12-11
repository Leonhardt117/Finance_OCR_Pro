import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedData, TableData } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TABLE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "The distinct title of this specific table (e.g., 'Balance Sheet', 'Processed Data'). Look for text immediately preceding the grid.",
    },
    summary: {
      type: Type.STRING,
      description: "A very short one-sentence summary of what this specific table represents.",
    },
    headers: {
      type: Type.ARRAY,
      description: "The column headers found in this table.",
      items: { type: Type.STRING },
    },
    rows: {
      type: Type.ARRAY,
      description: "The data rows for this table.",
      items: {
        type: Type.OBJECT,
        properties: {
          values: {
            type: Type.ARRAY,
            description: "The cell values for this row. The order MUST match the headers array exactly. Use empty strings for missing data.",
            items: { type: Type.STRING }
          }
        },
        required: ["values"], // Ensure values are always provided
      },
    },
  },
  required: ["headers", "rows"],
};

const DATA_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tables: {
      type: Type.ARRAY,
      description: "A list of ALL distinct tables found. CRITICAL: If there are multiple distinct grids or unrelated data sets, create a separate entry for EACH table. Do not merge them.",
      items: TABLE_SCHEMA,
    }
  },
  required: ["tables"],
};

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export const processImages = async (images: ImageInput[], instructions?: string): Promise<ExtractedData> => {
  try {
    const hasImages = images.length > 0;
    
    // Validation: Need at least images OR text instructions
    if (!hasImages && (!instructions || !instructions.trim())) {
        throw new Error("No content to process. Please upload images or provide text data.");
    }

    const imageParts = images.map(img => ({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType,
      },
    }));

    let promptText = "";

    if (hasImages) {
      // Standard OCR Prompt
      promptText = "Analyze these images of financial reports or data tables. Identify ALL distinct tables found. \n\nCRITICAL INSTRUCTION: The images may contain multiple separate tables (e.g. Table 1 followed by Table 2). You MUST extract them as separate items in the 'tables' list. Do not merge unrelated tables into one. Look for visual separators, different titles, or different column headers to distinguish tables.\n\nFor each table:\n1. Extract the specific title text appearing above the table (e.g. '2. Goodwill Impairment').\n2. Identify headers accurately.\n3. Extract all rows, ensuring values align with headers.\n\nSupport Chinese characters and other languages accurately. Maintain the original text content.";

      if (instructions && instructions.trim().length > 0) {
        promptText += `\n\nIMPORTANT USER INSTRUCTIONS: The user has provided specific requirements for what to extract: "${instructions}". Follow these instructions strictly when selecting which data to extract or ignore.`;
      }
    } else {
      // Text-Only / Raw Data Prompt
      promptText = `Analyze the following RAW TEXT DATA provided by the user. Your task is to interpret this unstructured data and format it into a clean, structured JSON table.\n\n` +
        `RAW DATA:\n"${instructions}"\n\n` +
        `PROCESSING RULES:\n` +
        `1. **Delimiters**: The user may have pasted numbers or text separated by spaces, newlines, commas (,), or Chinese commas (，). Treat these as delimiters.\n` +
        `2. **Table Structure**: If it is a simple list of numbers, create a single-column or single-row table as appropriate, with a generic header like "Value" or "Amount". If it looks like a matrix (CSV-like), structure it with appropriate headers.\n` +
        `3. **No Modification**: Do not round or alter the numerical values (keep decimals exactly as they are).\n` +
        `4. **Negative Numbers**: Interpret numbers enclosed in parentheses like "(123.45)" or "(1,000)" as negative numbers (e.g., -123.45).\n` +
        `5. **Title**: If no clear title exists in the text, use "Processed Raw Data" as the title.\n`;
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          ...imageParts,
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: DATA_SCHEMA,
        temperature: 0.1, // Low temperature for higher accuracy
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No data returned from Gemini.");
    }

    const rawData = JSON.parse(text);

    if (!rawData.tables || !Array.isArray(rawData.tables)) {
       throw new Error("Invalid response format: 'tables' array missing.");
    }

    const processedTables: TableData[] = rawData.tables.map((table: any) => {
      // Transform the raw schema response (arrays) to the Application's TableData format (objects with keys)
      const formattedRows = table.rows.map((row: any) => {
        const rowObject: Record<string, string | number> = {};
        table.headers.forEach((header: string, index: number) => {
          // Map the value at index to the header key
          // Handle case where values array might be shorter than headers
          rowObject[header] = row.values && row.values[index] !== undefined ? row.values[index] : "";
        });
        return rowObject;
      });

      return {
        title: table.title,
        summary: table.summary,
        headers: table.headers,
        rows: formattedRows
      };
    });

    return {
      tables: processedTables
    };

  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};
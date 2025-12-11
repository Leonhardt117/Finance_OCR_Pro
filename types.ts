export interface TableData {
  headers: string[];
  rows: Record<string, string | number>[];
  title?: string;
  summary?: string;
}

export interface ExtractedData {
  tables: TableData[];
}

export interface ProcessingOptions {
  multiplier: number;
  decimalPlaces: number; // -1 indicates "keep all"
  customInstruction: string;
  forceNegative: boolean;
  titleCase: boolean;
}

export enum ViewMode {
  TABLE = 'TABLE',
  LIST = 'LIST',
}

export interface OcrState {
  isLoading: boolean;
  data: ExtractedData | null;
  error: string | null;
}
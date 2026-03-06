
export type CountryCode = string;

export interface DesignCodeFile {
  id: string;
  name: string;
  country: CountryCode;
  uploadDate: string;
  size: number;
  content: string; 
  blob?: Blob;      
  blobUrl?: string; 
  folderPath: string; // Hierarchy support: e.g., "ABU DHABI/ESTIDAMA"
}

export interface DesignCodeFolder {
  name: string;
  isPredefined?: boolean;
}

export type ViewState = 'WELCOME' | 'COUNTRIES' | 'COUNTRY_DETAIL' | 'ANALYSIS';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sourceFileId?: string; 
  sourceFileName?: string; 
}

export interface CountryRecord {
  code: string;
  name: string;
  fullName: string;
  color: string;
  flag: string;
  description: string;
}

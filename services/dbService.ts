
import { DesignCodeFile, CountryRecord } from '../types';
import { io } from 'socket.io-client';

const socket = io();

export interface FolderRecord {
  id: string;
  name: string;
  parentPath: string; // e.g. "ABU DHABI" or ""
  country: string;
}

export const initDB = async (): Promise<void> => {
  // No-op for server-side
};

export const saveFileToDB = async (file: DesignCodeFile): Promise<void> => {
  const formData = new FormData();
  if (file.blob) {
    formData.append('file', file.blob, file.name);
  }
  
  const { blob, blobUrl, ...metadata } = file;
  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch('/api/files', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) throw new Error(`Failed to save file (Status: ${response.status})`);
};

export const getAllFilesFromDB = async (): Promise<DesignCodeFile[]> => {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data.files.map((f: any) => ({
    ...f,
    blobUrl: f.serverPath ? `${window.location.origin}${f.serverPath}` : undefined
  }));
};

export const deleteFileFromDB = async (id: string): Promise<void> => {
  const response = await fetch(`/api/files/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`Failed to delete file (Status: ${response.status})`);
};

// Folder Operations
export const saveFolderToDB = async (folder: FolderRecord): Promise<void> => {
  const response = await fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folder),
  });
  if (!response.ok) throw new Error(`Failed to save folder (Status: ${response.status})`);
};

export const getAllFoldersFromDB = async (): Promise<FolderRecord[]> => {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data.folders;
};

export const deleteFolderFromDB = async (id: string): Promise<void> => {
  const response = await fetch(`/api/folders/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`Failed to delete folder (Status: ${response.status})`);
};

// Country Operations
export const saveCountryToDB = async (country: CountryRecord): Promise<void> => {
  const response = await fetch('/api/countries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(country),
  });
  if (!response.ok) throw new Error(`Failed to save country (Status: ${response.status})`);
};

export const getAllCountriesFromDB = async (): Promise<CountryRecord[]> => {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data.countries;
};

export const deleteCountryFromDB = async (code: string): Promise<void> => {
  const response = await fetch(`/api/countries/${code}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`Failed to delete country (Status: ${response.status})`);
};

export const onDataUpdate = (callback: (update: any) => void) => {
  socket.on('data_updated', callback);
  return () => socket.off('data_updated', callback);
};


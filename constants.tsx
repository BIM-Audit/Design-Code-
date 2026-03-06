
import React from 'react';
import { CountryCode } from './types';

export interface CountryData {
  code: CountryCode;
  name: string;
  fullName: string;
  color: string;
  flag: string;
  description: string;
}

export const COUNTRIES: CountryData[] = [
  {
    code: 'KSA',
    name: 'Saudi Arabia',
    fullName: 'Kingdom of Saudi Arabia',
    color: 'bg-emerald-600',
    flag: '🇸🇦',
    description: 'Saudi Building Code (SBC) and regional urban planning standards.'
  },
  {
    code: 'UAE',
    name: 'UAE',
    fullName: 'United Arab Emirates',
    color: 'bg-red-600',
    flag: '🇦🇪',
    description: 'Dubai/Abu Dhabi Building Codes and UAE Fire and Life Safety Code.'
  },
  {
    code: 'Qatar',
    name: 'Qatar',
    fullName: 'State of Qatar',
    color: 'bg-rose-900',
    flag: '🇶🇦',
    description: 'Qatar National Construction Standards (QCS) and GSAS regulations.'
  }
];

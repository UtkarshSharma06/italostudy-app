export interface UniversityThreshold {
    university: string;
    exam: 'imat' | 'cent-s';
    euThreshold: number;
    nonEuThreshold: number;
    year: number;
}

export const ADMISSION_THRESHOLDS: UniversityThreshold[] = [
    { university: 'University of Pavia', exam: 'imat', euThreshold: 54.5, nonEuThreshold: 42.0, year: 2024 },
    { university: 'University of Milan', exam: 'imat', euThreshold: 63.7, nonEuThreshold: 48.5, year: 2024 },
    { university: 'Rome Sapienza', exam: 'imat', euThreshold: 58.2, nonEuThreshold: 44.1, year: 2024 },
    { university: 'University of Bologna', exam: 'imat', euThreshold: 61.5, nonEuThreshold: 46.8, year: 2024 },
    { university: 'University of Turin', exam: 'imat', euThreshold: 56.1, nonEuThreshold: 41.5, year: 2024 },
    { university: 'Cattolica', exam: 'cent-s', euThreshold: 52.0, nonEuThreshold: 45.0, year: 2024 },
    { university: 'San Raffaele', exam: 'cent-s', euThreshold: 58.5, nonEuThreshold: 50.0, year: 2024 },
    { university: 'Humanitas', exam: 'cent-s', euThreshold: 55.0, nonEuThreshold: 48.0, year: 2024 }
];

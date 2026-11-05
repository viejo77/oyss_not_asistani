import { TopicDistributionFile, SchoolLevel } from '../types';

/**
 * Creates a blank, clean topic distribution structure for any selected subject & grade.
 * No hardcoded outcomes or pre-filled questions are forced.
 */
export const createDefaultDistribution = (
  level: SchoolLevel = 'ortaokul',
  grade: number = 6,
  subject: string = 'Matematik'
): TopicDistributionFile => ({
  id: `dist_${level}_${grade}_${subject.toLowerCase().replace(/[\s\.]/g, '_')}`,
  title: `${grade}. Sınıf ${subject} Dersi Ortak Yazılı Sınavı`,
  level,
  grade,
  subject,
  period: '1_donem_2_yazili',
  isNationalExam: false,
  scenarios: ['Senaryo 1', 'Senaryo 2', 'Senaryo 3', 'Senaryo 4', 'Senaryo 5', 'Senaryo 6', 'Senaryo 7'],
  rows: [],
});

/**
 * No preloaded/ready-made distributions come by default.
 * Teachers can enter scores directly, or an admin can upload an Excel table if desired.
 */
export const DEFAULT_DISTRIBUTIONS: TopicDistributionFile[] = [];

export const AVAILABLE_SUBJECTS = {
  ortaokul: [
    'Matematik',
    'Türkçe',
    'Fen Bilimleri',
    'Sosyal Bilgiler',
    'T.C. İnkılap Tarihi ve Atatürkçülük',
    'İngilizce',
    'Din Kültürü ve Ahlak Bilgisi',
  ],
  lise: [
    'Matematik',
    'Türk Dili ve Edebiyatı',
    'Fizik',
    'Kimya',
    'Biyoloji',
    'Tarih',
    'Coğrafya',
    'Felsefe',
    'İngilizce',
    'Din Kültürü ve Ahlak Bilgisi',
  ],
};

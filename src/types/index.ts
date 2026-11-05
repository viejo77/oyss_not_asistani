export type SchoolLevel = 'ortaokul' | 'lise';

export type ExamPeriod = 
  | '1_donem_1_yazili'
  | '1_donem_2_yazili'
  | '2_donem_1_yazili'
  | '2_donem_2_yazili';

export interface DistributionRow {
  id: string;
  unit: string; // Ünite / Tema
  topic: string; // Konu (İçerik Çerçevesi)
  outcomeCode: string; // Öğrenme Çıktısı Kodu (örn: MAT.6.1.5)
  outcomeDescription: string; // Öğrenme Çıktısı Açıklaması
  scenarioCounts: { [scenarioKey: string]: number }; // örn: { "Senaryo 1": 1, "Senaryo 2": 0, ... }
}

export interface QuestionBareme {
  questionNumber: number;
  outcomeCode: string;
  outcomeDescription: string;
  topic: string;
  unit: string;
  maxScore: number;
  criteria?: string; // Barem ölçütü / rubrik basamakları (ör. İşlem basamakları: 5p, Doğru sonuç: 5p)
}

export interface Student {
  id: string;
  studentNumber: string;
  fullName: string;
  scores: { [questionNumber: number]: number | 'G' | 'g' | '' }; // G: Girmedi
}

export interface ExamMetadata {
  schoolName: string;
  academicYear: string;
  level: SchoolLevel;
  grade: number; // 5, 6, 7, 8, 9, 10, 11, 12
  subject: string;
  branch: string; // Şube örn: 6/A, 10/B
  period: ExamPeriod;
  scenarioName: string; // örn: "Senaryo 1"
  questionCount?: number; // Sınavdaki toplam soru sayısı
  teacherName: string;
  examDate: string;
}

export interface TopicDistributionFile {
  id: string;
  title: string;
  level: SchoolLevel;
  grade: number;
  subject: string;
  period: ExamPeriod;
  isNationalExam?: boolean; // Ülke Geneli Ortak Sınav mı?
  nationalExamNote?: string;
  scenarios: string[]; // ["Senaryo 1", "Senaryo 2", "Senaryo 3", "Senaryo 4", "Senaryo 5"]
  rows: DistributionRow[];
}

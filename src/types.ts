export interface Student {
  id: string;
  name: string;
  grade: string;
  status: 'normal' | 'risk' | 'critical';
  lastUpdate: string;
  riskScore: number;
}

export interface Alert {
  id: string;
  studentId: string;
  timestamp: string;
  riskScore: number;
  emotion: string;
  textSentiment: string;
  behavioralNotes: string;
  level: 'low' | 'medium' | 'high';
}

export interface DetectionResult {
  emotion: string;
  sentiment: string;
  riskScore: number;
  isUnusualBehavior: boolean;
}

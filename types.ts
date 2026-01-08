
export enum AnalysisType {
  DATA_ANALYSIS = 'DATA_ANALYSIS',
  JOURNEY_MAP = 'JOURNEY_MAP',
  PERSONA = 'PERSONA',
  COMPETITOR = 'COMPETITOR',
  OPPORTUNITIES = 'OPPORTUNITIES',
  COMPREHENSIVE = 'COMPREHENSIVE'
}

export interface PersonaData {
  name: string;
  role: string;
  age: number;
  tags: string[];
  bio: string;
  goals: string[];
  painPoints: string[];
  insuranceNeeds: string[];
  opportunityPoints: string[];
  evidence: string[];
  imageUrl?: string;
  imagePrompt?: string;
}

export interface JourneyStage {
  phase: string;
  userNeeds: string[];
  actions: string[];
  touchpoints: string[];
  emotions: number; // 1 to 5
  emotionInsight: string; 
  painPoints: string[];
  opportunities: string[];
}

export interface StatPoint {
  label: string;
  value: number;
}

export interface ChartData {
  title: string;
  totalResponses: number;
  data: StatPoint[];
}

export interface RegressionResult {
  independentVar: string;
  dependentVar: string;
  correlation: number;
  insight: string;
}

export interface AnalysisResult {
  charts: ChartData[];
  correlations: RegressionResult[];
  painPoints: string[];
  opportunities: string[];
  summary: string;
}

export interface OpportunityData {
  category: string;
  description: string;
  impact: string;
  feasibility: string;
}

export interface ComprehensiveReport {
  summary: string;
  dataAnalysis: AnalysisResult;
  personas: PersonaData[];
  journey: JourneyStage[];
  opportunities: OpportunityData[];
}

export interface Section {
  id: string;
  name: string;
  project: string;
}

export interface CheckItem {
  id: string;
  name: string;
  category: string;
  standard: string;
  tolerance: number;
  unit: string;
}

export interface InspectionPoint {
  id: string;
  checkItemId: string;
  checkItemName: string;
  location: string;
  standardValue: string;
  measuredValue: string;
  isDeviation: boolean;
  photos: string[];
  inspector: string;
  rectificationOpinion: string;
  rectificationDeadline: string;
  retestValue: string;
  retestPhotos: string[];
  retestDate: string;
  retestInspector: string;
}

export type TaskStatus = 'planned' | 'inspecting' | 'rectifying' | 'pending_sign' | 'signed';

export interface SamplingTask {
  id: string;
  sectionId: string;
  sectionName: string;
  date: string;
  status: TaskStatus;
  checkItemIds: string[];
  points: InspectionPoint[];
  supervisorName: string;
  signResult: 'approved' | 'rejected' | 'observing';
  signDate: string;
  signComment: string;
}

export interface CheckCategory {
  name: string;
  items: CheckItem[];
}

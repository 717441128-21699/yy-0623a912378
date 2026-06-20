import { create } from 'zustand';
import type { Section, CheckCategory, SamplingTask, InspectionPoint, TaskStatus } from '@/types/inspection';
import { mockSections, mockCheckCategories, mockTasks, generateRandomLocations } from '@/data/mock';

interface InspectionStore {
  sections: Section[];
  checkCategories: CheckCategory[];
  tasks: SamplingTask[];

  createTask: (sectionId: string, sectionName: string, checkItemIds: string[]) => string;
  updatePoint: (taskId: string, pointId: string, data: Partial<InspectionPoint>) => void;
  submitTask: (taskId: string) => void;
  submitRetest: (taskId: string, pointId: string, retestValue: string, retestPhotos: string[], retestInspector: string) => void;
  signOff: (taskId: string, result: 'approved' | 'rejected' | 'observing', comment: string) => void;
  getTaskById: (taskId: string) => SamplingTask | undefined;
  getTasksByStatus: (status: TaskStatus) => SamplingTask[];
}

let taskIdCounter = 100;
let pointIdCounter = 200;

export const useInspectionStore = create<InspectionStore>((set, get) => ({
  sections: mockSections,
  checkCategories: mockCheckCategories,
  tasks: mockTasks,

  createTask: (sectionId, sectionName, checkItemIds) => {
    const newTaskId = `t${++taskIdCounter}`;
    const allItems = mockCheckCategories.flatMap(cat => cat.items);
    const selectedItems = allItems.filter(item => checkItemIds.includes(item.id));
    const points: InspectionPoint[] = [];

    selectedItems.forEach(item => {
      const locationCount = 2 + Math.floor(Math.random() * 3);
      const locations = generateRandomLocations(locationCount);
      locations.forEach(loc => {
        points.push({
          id: `p${++pointIdCounter}`,
          checkItemId: item.id,
          checkItemName: item.name,
          location: loc,
          standardValue: item.standard.replace('≤', '').replace('±', ''),
          measuredValue: '',
          isDeviation: false,
          photos: [],
          inspector: '',
          rectificationOpinion: '',
          rectificationDeadline: '',
          retestValue: '',
          retestPhotos: [],
          retestDate: '',
          retestInspector: '',
        });
      });
    });

    const newTask: SamplingTask = {
      id: newTaskId,
      sectionId,
      sectionName,
      date: new Date().toISOString().split('T')[0],
      status: 'inspecting',
      checkItemIds,
      points,
      supervisorName: '王监理',
      signResult: 'approved',
      signDate: '',
      signComment: '',
    };

    set(state => ({ tasks: [newTask, ...state.tasks] }));
    return newTaskId;
  },

  updatePoint: (taskId, pointId, data) => {
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              points: task.points.map(point =>
                point.id === pointId ? { ...point, ...data } : point
              ),
            }
          : task
      ),
    }));
  },

  submitTask: (taskId) => {
    set(state => ({
      tasks: state.tasks.map(task => {
        if (task.id !== taskId) return task;
        const hasDeviation = task.points.some(p => p.isDeviation);
        const hasRectificationPending = task.points.some(
          p => p.isDeviation && !p.retestValue
        );
        let newStatus: TaskStatus = 'pending_sign';
        if (hasRectificationPending) {
          newStatus = 'rectifying';
        }
        return { ...task, status: newStatus };
      }),
    }));
  },

  submitRetest: (taskId, pointId, retestValue, retestPhotos, retestInspector) => {
    set(state => ({
      tasks: state.tasks.map(task => {
        if (task.id !== taskId) return task;
        const updatedPoints = task.points.map(point =>
          point.id === pointId
            ? {
                ...point,
                retestValue,
                retestPhotos,
                retestDate: new Date().toISOString().split('T')[0],
                retestInspector,
              }
            : point
        );
        const allRetested = updatedPoints
          .filter(p => p.isDeviation)
          .every(p => p.retestValue);
        const newStatus: TaskStatus = allRetested ? 'pending_sign' : 'rectifying';
        return { ...task, points: updatedPoints, status: newStatus };
      }),
    }));
  },

  signOff: (taskId, result, comment) => {
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: 'signed' as TaskStatus,
              signResult: result,
              signDate: new Date().toISOString().split('T')[0],
              signComment: comment,
            }
          : task
      ),
    }));
  },

  getTaskById: (taskId) => {
    return get().tasks.find(t => t.id === taskId);
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status);
  },
}));

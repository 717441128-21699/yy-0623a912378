import { create } from 'zustand';
import Taro from '@tarojs/taro';
import type { Section, CheckCategory, SamplingTask, InspectionPoint, TaskStatus } from '@/types/inspection';
import { mockSections, mockCheckCategories, mockTasks, generateRandomLocations } from '@/data/mock';

const STORAGE_KEY_TASKS = 'inspection_tasks_v1';
const STORAGE_KEY_COUNTERS = 'inspection_counters_v1';

function loadPersistedTasks(): SamplingTask[] {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY_TASKS);
    if (raw && Array.isArray(raw) && raw.length > 0) {
      console.info('[Store] Load persisted tasks count:', raw.length);
      return raw;
    }
  } catch (e) {
    console.error('[Store] loadTasks error:', e);
  }
  return mockTasks;
}

function loadPersistedCounters() {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY_COUNTERS);
    if (raw && typeof raw === 'object') {
      return { taskIdCounter: raw.taskIdCounter || 100, pointIdCounter: raw.pointIdCounter || 200 };
    }
  } catch (e) {
    console.error('[Store] loadCounters error:', e);
  }
  return { taskIdCounter: 100, pointIdCounter: 200 };
}

function persistTasks(tasks: SamplingTask[]) {
  try {
    Taro.setStorageSync(STORAGE_KEY_TASKS, tasks);
  } catch (e) {
    console.error('[Store] persistTasks error:', e);
  }
}

function persistCounters(taskIdCounter: number, pointIdCounter: number) {
  try {
    Taro.setStorageSync(STORAGE_KEY_COUNTERS, { taskIdCounter, pointIdCounter });
  } catch (e) {
    console.error('[Store] persistCounters error:', e);
  }
}

interface InspectionStore {
  sections: Section[];
  checkCategories: CheckCategory[];
  tasks: SamplingTask[];

  createTask: (sectionId: string, sectionName: string, checkItemIds: string[]) => string;
  updatePoint: (taskId: string, pointId: string, data: Partial<InspectionPoint>) => void;
  submitTask: (taskId: string) => void;
  submitRetest: (taskId: string, pointId: string, retestValue: string, retestPhotos: string[], retestInspector: string) => void;
  signOff: (taskId: string, result: 'approved' | 'rejected' | 'observing', comment: string) => void;
  revertForReRectify: (taskId: string) => void;
  getTaskById: (taskId: string) => SamplingTask | undefined;
  getTasksByStatus: (status: TaskStatus) => SamplingTask[];
}

const initialCounters = loadPersistedCounters();
let taskIdCounter = initialCounters.taskIdCounter;
let pointIdCounter = initialCounters.pointIdCounter;

export const useInspectionStore = create<InspectionStore>((set, get) => ({
  sections: mockSections,
  checkCategories: mockCheckCategories,
  tasks: loadPersistedTasks(),

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

    set(state => {
      const nextTasks = [newTask, ...state.tasks];
      persistTasks(nextTasks);
      persistCounters(taskIdCounter, pointIdCounter);
      return { tasks: nextTasks };
    });
    return newTaskId;
  },

  updatePoint: (taskId, pointId, data) => {
    set(state => {
      const nextTasks = state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              points: task.points.map(point =>
                point.id === pointId ? { ...point, ...data } : point
              ),
            }
          : task
      );
      persistTasks(nextTasks);
      return { tasks: nextTasks };
    });
  },

  submitTask: (taskId) => {
    set(state => {
      const nextTasks = state.tasks.map(task => {
        if (task.id !== taskId) return task;
        const hasRectificationPending = task.points.some(
          p => p.isDeviation && !p.retestValue
        );
        let newStatus: TaskStatus = 'pending_sign';
        if (hasRectificationPending) {
          newStatus = 'rectifying';
        }
        return { ...task, status: newStatus };
      });
      persistTasks(nextTasks);
      return { tasks: nextTasks };
    });
  },

  submitRetest: (taskId, pointId, retestValue, retestPhotos, retestInspector) => {
    set(state => {
      const nextTasks = state.tasks.map(task => {
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
      });
      persistTasks(nextTasks);
      return { tasks: nextTasks };
    });
  },

  signOff: (taskId, result, comment) => {
    set(state => {
      const nextTasks = state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: 'signed' as TaskStatus,
              signResult: result,
              signDate: new Date().toISOString().split('T')[0],
              signComment: comment,
            }
          : task
      );
      persistTasks(nextTasks);
      return { tasks: nextTasks };
    });
  },

  revertForReRectify: (taskId) => {
    set(state => {
      const nextTasks = state.tasks.map(task => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          status: 'rectifying' as TaskStatus,
          points: task.points.map(p =>
            p.isDeviation
              ? { ...p, retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '' }
              : p
          ),
        };
      });
      persistTasks(nextTasks);
      return { tasks: nextTasks };
    });
  },

  getTaskById: (taskId) => {
    return get().tasks.find(t => t.id === taskId);
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status);
  },
}));

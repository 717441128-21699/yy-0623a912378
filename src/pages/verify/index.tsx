import React, { useState, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import StatusTag from '@/components/StatusTag';
import { useInspectionStore } from '@/store/inspection';
import type { TaskStatus } from '@/types/inspection';
import styles from './index.module.scss';

type FilterType = 'all' | 'inspecting' | 'rectifying';

const VerifyPage: React.FC = () => {
  const { tasks } = useInspectionStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const activeTasks = useMemo(
    () => tasks.filter(t => t.status === 'inspecting' || t.status === 'rectifying'),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return activeTasks;
    return activeTasks.filter(t => t.status === filter);
  }, [activeTasks, filter]);

  const stats = useMemo(() => ({
    total: activeTasks.length,
    inspecting: activeTasks.filter(t => t.status === 'inspecting').length,
    rectifying: activeTasks.filter(t => t.status === 'rectifying').length,
  }), [activeTasks]);

  const getProgress = (task: typeof tasks[0]) => {
    const measured = task.points.filter(p => p.measuredValue).length;
    return task.points.length > 0 ? Math.round((measured / task.points.length) * 100) : 0;
  };

  const handleTaskClick = (taskId: string, status: TaskStatus) => {
    Taro.navigateTo({ url: `/pages/verify-detail/index?taskId=${taskId}` });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>现场复核</Text>
        <View className={styles.filterRow}>
          {([
            { key: 'all', label: '全部' },
            { key: 'inspecting', label: '检查中' },
            { key: 'rectifying', label: '整改中' },
          ] as const).map(item => (
            <Button
              key={item.key}
              className={classnames(
                styles.filterBtn,
                filter === item.key && styles.filterBtnActive
              )}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </View>
      </View>

      <View className={styles.body}>
        <View className={styles.statRow}>
          <View className={styles.statCard}>
            <Text className={styles.statNumber}>{stats.total}</Text>
            <Text className={styles.statLabel}>进行中任务</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNumber}>{stats.inspecting}</Text>
            <Text className={styles.statLabel}>检查中</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNumber}>{stats.rectifying}</Text>
            <Text className={styles.statLabel}>整改中</Text>
          </View>
        </View>

        {filteredTasks.length === 0 && (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无进行中的复核任务</Text>
          </View>
        )}

        {filteredTasks.map(task => (
          <View
            key={task.id}
            className={styles.taskCard}
            onClick={() => handleTaskClick(task.id, task.status)}
          >
            <View className={styles.taskHeader}>
              <Text className={styles.taskSection}>{task.sectionName}</Text>
              <StatusTag status={task.status} />
            </View>
            <View className={styles.taskBody}>
              <View className={styles.taskInfo}>
                <Text className={styles.taskInfoLabel}>抽检日期</Text>
                <Text className={styles.taskInfoValue}>{task.date}</Text>
              </View>
              <View className={styles.taskInfo}>
                <Text className={styles.taskInfoLabel}>检查项目</Text>
                <Text className={styles.taskInfoValue}>
                  {task.points.map(p => p.checkItemName).filter((v, i, a) => a.indexOf(v) === i).join('、')}
                </Text>
              </View>
              <View className={styles.taskInfo}>
                <Text className={styles.taskInfoLabel}>抽检点数</Text>
                <Text className={styles.taskInfoValue}>{task.points.length}个</Text>
              </View>
              <View className={styles.progressRow}>
                <View className={styles.progressBar}>
                  <View
                    className={styles.progressFill}
                    style={{ width: `${getProgress(task)}%` }}
                  />
                </View>
                <Text className={styles.progressText}>{getProgress(task)}%</Text>
              </View>
            </View>
            <View className={styles.taskActions}>
              {task.status === 'inspecting' && (
                <Button
                  className={classnames(styles.actionBtn, styles.actionPrimary)}
                  onClick={e => { e.stopPropagation(); handleTaskClick(task.id, task.status); }}
                >
                  继续录入
                </Button>
              )}
              {task.status === 'rectifying' && (
                <>
                  <Button
                    className={classnames(styles.actionBtn, styles.actionWarning)}
                    onClick={e => { e.stopPropagation(); handleTaskClick(task.id, task.status); }}
                  >
                    整改复测
                  </Button>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default VerifyPage;

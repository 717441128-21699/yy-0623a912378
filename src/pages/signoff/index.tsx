import React, { useState, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import StatusTag from '@/components/StatusTag';
import { useInspectionStore } from '@/store/inspection';
import type { TaskStatus } from '@/types/inspection';
import styles from './index.module.scss';

type FilterType = 'all' | 'pending_sign' | 'signed';

const SignoffPage: React.FC = () => {
  const { tasks } = useInspectionStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const signTasks = useMemo(
    () => tasks.filter(t => t.status === 'pending_sign' || t.status === 'signed'),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return signTasks;
    return signTasks.filter(t => t.status === filter);
  }, [signTasks, filter]);

  const stats = useMemo(() => ({
    pending: signTasks.filter(t => t.status === 'pending_sign').length,
    approved: signTasks.filter(t => t.status === 'signed' && t.signResult === 'approved').length,
    rejected: signTasks.filter(t => t.status === 'signed' && t.signResult === 'rejected').length,
    observing: signTasks.filter(t => t.status === 'signed' && t.signResult === 'observing').length,
  }), [signTasks]);

  const getDeviationPoints = (task: typeof tasks[0]) => {
    return task.points.filter(p => p.isDeviation);
  };

  const handleSignoff = (taskId: string) => {
    Taro.navigateTo({ url: `/pages/signoff-detail/index?taskId=${taskId}` });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>签认记录</Text>
        <View className={styles.filterRow}>
          {([
            { key: 'all', label: '全部' },
            { key: 'pending_sign', label: '待签认' },
            { key: 'signed', label: '已签认' },
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
            <Text className={classnames(styles.statNumber, styles.statNumberPending)}>{stats.pending}</Text>
            <Text className={styles.statLabel}>待签认</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={classnames(styles.statNumber, styles.statNumberApproved)}>{stats.approved}</Text>
            <Text className={styles.statLabel}>已通过</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={classnames(styles.statNumber, styles.statNumberRejected)}>{stats.rejected}</Text>
            <Text className={styles.statLabel}>已退回</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={classnames(styles.statNumber, styles.statNumberObserving)}>{stats.observing}</Text>
            <Text className={styles.statLabel}>观察中</Text>
          </View>
        </View>

        {filteredTasks.length === 0 && (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📝</Text>
            <Text className={styles.emptyText}>暂无签认记录</Text>
          </View>
        )}

        {filteredTasks.map(task => {
          const deviations = getDeviationPoints(task);
          return (
            <View
              key={task.id}
              className={styles.recordCard}
            >
              <View className={styles.recordHeader}>
                <Text className={styles.recordSection}>{task.sectionName}</Text>
                <StatusTag status={task.status} />
              </View>
              <View className={styles.recordBody}>
                <View className={styles.recordInfo}>
                  <Text className={styles.recordInfoLabel}>抽检日期</Text>
                  <Text className={styles.recordInfoValue}>{task.date}</Text>
                </View>
                <View className={styles.recordInfo}>
                  <Text className={styles.recordInfoLabel}>抽检点数</Text>
                  <Text className={styles.recordInfoValue}>{task.points.length}个</Text>
                </View>
                <View className={styles.recordInfo}>
                  <Text className={styles.recordInfoLabel}>偏差点数</Text>
                  <Text className={classnames(
                    styles.recordInfoValue,
                    deviations.length > 0 && styles.dataCompareOriginal
                  )}>{deviations.length}个</Text>
                </View>
                {deviations.length > 0 && (
                  <View className={styles.dataCompare}>
                    <View className={styles.dataCompareItem}>
                      <Text className={styles.dataCompareLabel}>实测值</Text>
                      <Text className={classnames(styles.dataCompareValue, styles.dataCompareOriginal)}>
                        {deviations[0].measuredValue}mm
                      </Text>
                    </View>
                    {deviations[0].retestValue && (
                      <View className={styles.dataCompareItem}>
                        <Text className={styles.dataCompareLabel}>复测值</Text>
                        <Text className={classnames(styles.dataCompareValue, styles.dataCompareRetest)}>
                          {deviations[0].retestValue}mm
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {task.status === 'signed' && (
                  <View className={styles.recordInfo}>
                    <Text className={styles.recordInfoLabel}>签认结果</Text>
                    <Text className={styles.recordInfoValue}>
                      {task.signResult === 'approved' ? '通过' : task.signResult === 'rejected' ? '退回' : '继续观察'}
                    </Text>
                  </View>
                )}
              </View>
              <View className={styles.recordActions}>
                {task.status === 'pending_sign' ? (
                  <Button
                    className={classnames(styles.actionBtn, styles.actionPrimary)}
                    onClick={() => handleSignoff(task.id)}
                  >
                    去签认
                  </Button>
                ) : (
                  <Button
                    className={classnames(styles.actionBtn, styles.actionPrimary)}
                    onClick={() => handleSignoff(task.id)}
                  >
                    查看详情
                  </Button>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SignoffPage;

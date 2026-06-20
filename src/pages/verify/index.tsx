import React, { useState, useMemo } from 'react';
import { View, Text, Button, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import StatusTag from '@/components/StatusTag';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

type FilterType = 'all' | 'inspecting' | 'rectifying';

interface RectifyPointItem {
  taskId: string;
  pointId: string;
  sectionName: string;
  checkItemName: string;
  location: string;
  measuredValue: string;
  standardValue: string;
  photos: string[];
  rectificationOpinion: string;
  rectificationDeadline: string;
  retestValue: string;
  remainingDays: number;
  overdue: boolean;
  urgent: boolean;
}

const diffDays = (targetDateStr: string): number => {
  if (!targetDateStr) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr.replace(/-/g, '/'));
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const VerifyPage: React.FC = () => {
  const { tasks } = useInspectionStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showTracking, setShowTracking] = useState(true);

  const activeTasks = useMemo(
    () => tasks.filter(t => t.status === 'inspecting' || t.status === 'rectifying' || t.status === 'pending_sign' || t.status === 'signed'),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return activeTasks.filter(t => t.status === 'inspecting' || t.status === 'rectifying');
    return activeTasks.filter(t => t.status === filter);
  }, [activeTasks, filter]);

  const stats = useMemo(() => {
    const current = tasks.filter(t => t.status === 'inspecting' || t.status === 'rectifying');
    return {
      total: current.length,
      inspecting: current.filter(t => t.status === 'inspecting').length,
      rectifying: current.filter(t => t.status === 'rectifying').length,
    };
  }, [tasks]);

  const rectifyPoints: RectifyPointItem[] = useMemo(() => {
    const list: RectifyPointItem[] = [];
    tasks.forEach(task => {
      task.points.forEach(point => {
        if (!point.isDeviation || !point.rectificationDeadline || point.retestValue) return;
        if (task.status === 'signed' && task.signResult === 'approved') return;
        const remaining = diffDays(point.rectificationDeadline);
        const item: RectifyPointItem = {
          taskId: task.id,
          pointId: point.id,
          sectionName: task.sectionName,
          checkItemName: point.checkItemName,
          location: point.location,
          measuredValue: point.measuredValue,
          standardValue: point.standardValue,
          photos: point.photos || [],
          rectificationOpinion: point.rectificationOpinion,
          rectificationDeadline: point.rectificationDeadline,
          retestValue: point.retestValue,
          remainingDays: remaining,
          overdue: remaining < 0,
          urgent: remaining >= 0 && remaining <= 2,
        };
        list.push(item);
      });
    });
    list.sort((a, b) => a.remainingDays - b.remainingDays);
    return list;
  }, [tasks]);

  const overduePoints = useMemo(() => rectifyPoints.filter(p => p.overdue), [rectifyPoints]);
  const urgentPoints = useMemo(() => rectifyPoints.filter(p => p.urgent), [rectifyPoints]);

  const getProgress = (task: typeof tasks[0]) => {
    const measured = task.points.filter(p => p.measuredValue).length;
    return task.points.length > 0 ? Math.round((measured / task.points.length) * 100) : 0;
  };

  const handleTaskClick = (taskId: string) => {
    Taro.navigateTo({ url: `/pages/verify-detail/index?taskId=${taskId}` });
  };

  const handlePreviewPhoto = (photos: string[], index: number) => {
    if (photos.length === 0) return;
    Taro.previewImage({ current: photos[index], urls: photos });
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

        {rectifyPoints.length > 0 && (
          <View className={styles.trackingCard}>
            <View className={styles.trackingHeader}>
              <Text className={styles.trackingTitle}>
                ⏰ 整改追踪
                {overduePoints.length > 0 && (
                  <Text className={styles.trackingBadgeOverdue}>{overduePoints.length}条超期</Text>
                )}
                {urgentPoints.length > 0 && overduePoints.length === 0 && (
                  <Text className={styles.trackingBadgeUrgent}>{urgentPoints.length}条临期</Text>
                )}
              </Text>
              <Text
                className={styles.trackingToggle}
                onClick={() => setShowTracking(v => !v)}
              >
                {showTracking ? '收起' : '展开'}
              </Text>
            </View>

            {showTracking && (
              <View className={styles.trackingList}>
                {rectifyPoints.map(point => (
                  <View
                    key={`${point.taskId}-${point.pointId}`}
                    className={classnames(
                      styles.trackingItem,
                      point.overdue && styles.trackingItemOverdue,
                      point.urgent && styles.trackingItemUrgent,
                    )}
                  >
                    <View className={styles.trackingItemHead}>
                      <Text className={styles.trackingItemSection}>{point.sectionName}</Text>
                      <View className={classnames(
                        styles.trackingItemStatus,
                        point.overdue && styles.trackingStatusOverdue,
                        point.urgent && !point.overdue && styles.trackingStatusUrgent,
                      )}>
                        {point.overdue
                          ? `已超期${Math.abs(point.remainingDays)}天`
                          : point.urgent
                            ? `剩余${point.remainingDays}天`
                            : `剩余${point.remainingDays}天`
                        }
                      </View>
                    </View>
                    <View className={styles.trackingItemMeta}>
                      <Text className={styles.trackingItemMetaLabel}>{point.checkItemName}</Text>
                      <Text className={styles.trackingItemMetaText}>{point.location}</Text>
                    </View>
                    <View className={styles.trackingItemData}>
                      <View className={styles.trackingItemDataBox}>
                        <Text className={styles.trackingItemDataLabel}>标准值</Text>
                        <Text className={styles.trackingItemDataValue}>{point.standardValue}mm</Text>
                      </View>
                      <View className={styles.trackingItemDataBox}>
                        <Text className={styles.trackingItemDataLabel}>实测值</Text>
                        <Text className={classnames(styles.trackingItemDataValue, styles.trackingItemDataOriginal)}>{point.measuredValue}mm</Text>
                      </View>
                      <View className={styles.trackingItemDataBox}>
                        <Text className={styles.trackingItemDataLabel}>期限</Text>
                        <Text className={classnames(
                          styles.trackingItemDataValue,
                          point.overdue && styles.trackingItemDataOverdue,
                        )}>{point.rectificationDeadline}</Text>
                      </View>
                    </View>
                    <View className={styles.trackingItemPhotos}>
                      <Text className={styles.trackingItemPhotosLabel}>原始照片：</Text>
                      <View className={styles.trackingItemPhotoGrid}>
                        {(point.photos || []).length === 0 ? (
                          <Text className={styles.trackingItemPhotosEmpty}>（无）</Text>
                        ) : (
                          (point.photos || []).slice(0, 3).map((photo, idx) => (
                            <Image
                              key={idx}
                              src={photo}
                              className={styles.trackingItemPhoto}
                              mode="aspectFill"
                              onClick={() => handlePreviewPhoto(point.photos || [], idx)}
                            />
                          ))
                        )}
                      </View>
                    </View>
                    <View className={styles.trackingItemOpinion}>
                      <Text className={styles.trackingItemOpinionLabel}>整改意见：</Text>
                      <Text className={styles.trackingItemOpinionText}>
                        {point.rectificationOpinion || '（暂无）'}
                      </Text>
                    </View>
                    <View className={styles.trackingItemActions}>
                      <Button
                        className={classnames(styles.trackingBtn, styles.trackingBtnPrimary)}
                        onClick={() => handleTaskClick(point.taskId)}
                      >
                        {point.retestValue ? '查看复测详情' : '📝 去复测 / 复核'}
                      </Button>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

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
            onClick={() => handleTaskClick(task.id)}
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
                  onClick={e => { e.stopPropagation(); handleTaskClick(task.id); }}
                >
                  继续录入
                </Button>
              )}
              {task.status === 'rectifying' && (
                <>
                  <Button
                    className={classnames(styles.actionBtn, styles.actionWarning)}
                    onClick={e => { e.stopPropagation(); handleTaskClick(task.id); }}
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

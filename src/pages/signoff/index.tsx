import React, { useState, useMemo } from 'react';
import { View, Text, Button, Picker, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import StatusTag from '@/components/StatusTag';
import { useInspectionStore } from '@/store/inspection';
import type { TaskStatus } from '@/types/inspection';
import styles from './index.module.scss';

type StatusFilter = 'all' | 'pending_sign' | 'signed';
type SignFilter = 'all' | 'approved' | 'rejected' | 'observing';

const ALL_ITEMS = '__all__';

const SignoffPage: React.FC = () => {
  const { tasks, sections, checkCategories } = useInspectionStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [signFilter, setSignFilter] = useState<SignFilter>('all');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [checkItemFilter, setCheckItemFilter] = useState<string>(ALL_ITEMS);

  const sectionNames = useMemo(
    () => {
      const names = sections.map(s => `${s.name} ${s.project}`);
      return ['全部标段', ...names];
    },
    [sections]
  );

  const checkItemList = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    checkCategories.forEach(cat => cat.items.forEach(i => items.push({ id: i.id, name: i.name })));
    return items;
  }, [checkCategories]);

  const allSignTasks = useMemo(
    () => tasks.filter(t => t.status === 'pending_sign' || t.status === 'signed'),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    let list = allSignTasks;
    if (statusFilter !== 'all') {
      list = list.filter(t => t.status === statusFilter);
    }
    if (signFilter !== 'all') {
      list = list.filter(t => t.status === 'signed' && t.signResult === signFilter);
    }
    if (sectionIndex > 0) {
      const target = sections[sectionIndex - 1];
      if (target) {
        list = list.filter(t =>
          t.sectionName.includes(target.name) || t.sectionName.includes(target.project)
        );
      }
    }
    if (checkItemFilter !== ALL_ITEMS) {
      list = list.filter(t => t.checkItemIds.includes(checkItemFilter));
    }
    return list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [allSignTasks, statusFilter, signFilter, sectionIndex, checkItemFilter, sections]);

  const stats = useMemo(() => ({
    pending: allSignTasks.filter(t => t.status === 'pending_sign').length,
    approved: allSignTasks.filter(t => t.status === 'signed' && t.signResult === 'approved').length,
    rejected: allSignTasks.filter(t => t.status === 'signed' && t.signResult === 'rejected').length,
    observing: allSignTasks.filter(t => t.status === 'signed' && t.signResult === 'observing').length,
  }), [allSignTasks]);

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
                statusFilter === item.key && styles.filterBtnActive
              )}
              onClick={() => setStatusFilter(item.key)}
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

        <View className={styles.archiveCard}>
          <Text className={styles.archiveTitle}>
            <Text className={styles.archiveIcon}>🗂️</Text>
            归档台账筛选
          </Text>
          <View className={styles.archivePickerRow}>
            <Picker
              mode="selector"
              range={sectionNames}
              value={sectionIndex}
              onChange={e => setSectionIndex(Number(e.detail.value))}
            >
              <View className={styles.archivePicker}>
                <Text className={styles.archivePickerValue}>{sectionNames[sectionIndex]}</Text>
                <Text className={styles.pickerArrow}>▼</Text>
              </View>
            </Picker>
          </View>
          <Text className={styles.archiveSubtitle}>签认结果</Text>
          <ScrollView scrollX className={styles.archiveFilterScroll}>
            <View className={styles.archiveFilterBar}>
              <Text
                className={classnames(
                  styles.archiveFilterItem,
                  signFilter === 'all' && styles.archiveFilterItemActive,
                )}
                onClick={() => setSignFilter('all')}
              >
                全部
              </Text>
              <Text
                className={classnames(
                  styles.archiveFilterItem,
                  styles.archiveFilterItemApproved,
                  signFilter === 'approved' && styles.archiveFilterItemApprovedActive,
                )}
                onClick={() => setSignFilter('approved')}
              >
                ✅ 通过
              </Text>
              <Text
                className={classnames(
                  styles.archiveFilterItem,
                  styles.archiveFilterItemRejected,
                  signFilter === 'rejected' && styles.archiveFilterItemRejectedActive,
                )}
                onClick={() => setSignFilter('rejected')}
              >
                ❌ 退回
              </Text>
              <Text
                className={classnames(
                  styles.archiveFilterItem,
                  styles.archiveFilterItemObserving,
                  signFilter === 'observing' && styles.archiveFilterItemObservingActive,
                )}
                onClick={() => setSignFilter('observing')}
              >
                👁️ 观察
              </Text>
            </View>
          </ScrollView>
          <Text className={styles.archiveSubtitle}>检查项</Text>
          <ScrollView scrollX className={styles.archiveFilterScroll}>
            <View className={styles.archiveFilterBar}>
              <Text
                className={classnames(
                  styles.archiveFilterItem,
                  styles.archiveFilterItemSmall,
                  checkItemFilter === ALL_ITEMS && styles.archiveFilterItemActive,
                )}
                onClick={() => setCheckItemFilter(ALL_ITEMS)}
              >
                全部
              </Text>
              {checkItemList.map(item => (
                <Text
                  key={item.id}
                  className={classnames(
                    styles.archiveFilterItem,
                    styles.archiveFilterItemSmall,
                    checkItemFilter === item.id && styles.archiveFilterItemActive,
                  )}
                  onClick={() => setCheckItemFilter(item.id)}
                >
                  {item.name}
                </Text>
              ))}
            </View>
          </ScrollView>
          <Text className={styles.archiveResultHint}>
            当前筛选结果：共 {filteredTasks.length} 条记录
            {sectionIndex > 0 && ` · ${sectionNames[sectionIndex]}`}
            {checkItemFilter !== ALL_ITEMS && (
              ` · ${checkItemList.find(i => i.id === checkItemFilter)?.name || ''}`
            )}
            {signFilter !== 'all' && (
              ` · ${signFilter === 'approved' ? '通过' : signFilter === 'rejected' ? '退回' : '观察'}`
            )}
          </Text>
        </View>

        {filteredTasks.length === 0 && (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📝</Text>
            <Text className={styles.emptyText}>暂无匹配的签认记录</Text>
          </View>
        )}

        {filteredTasks.map(task => {
          const deviations = task.points.filter(p => p.isDeviation);
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
                  <View className={styles.signInfoCard}>
                    <View className={styles.signInfoRow}>
                      <Text className={styles.signInfoLabel}>签认结果</Text>
                      <Text className={classnames(
                        styles.signInfoValue,
                        task.signResult === 'approved' && styles.signInfoApproved,
                        task.signResult === 'rejected' && styles.signInfoRejected,
                        task.signResult === 'observing' && styles.signInfoObserving,
                      )}>
                        {task.signResult === 'approved' ? '✅ 通过' : task.signResult === 'rejected' ? '❌ 退回' : '👁️ 继续观察'}
                      </Text>
                    </View>
                    {task.signDate && (
                      <View className={styles.signInfoRow}>
                        <Text className={styles.signInfoLabel}>签认日期</Text>
                        <Text className={styles.signInfoValuePlain}>{task.signDate}</Text>
                      </View>
                    )}
                    {task.signComment && (
                      <View className={styles.signInfoComment}>
                        <Text className={styles.signInfoCommentLabel}>签认意见</Text>
                        <Text className={styles.signInfoCommentText}>{task.signComment}</Text>
                      </View>
                    )}
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
                    查看详情与时间线
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

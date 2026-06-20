import React, { useState, useMemo } from 'react';
import { View, Text, Picker, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import CheckItemCard from '@/components/CheckItemCard';
import StatusTag from '@/components/StatusTag';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const ALL_FILTER = '__all__';

const SamplingPage: React.FC = () => {
  const { sections, checkCategories, createTask, tasks } = useInspectionStore();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [showHistory, setShowHistory] = useState(true);
  const [historySectionIndex, setHistorySectionIndex] = useState(0);
  const [historyFilterItemId, setHistoryFilterItemId] = useState<string>(ALL_FILTER);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const sectionNames = useMemo(
    () => sections.map(s => `${s.name} ${s.project}`),
    [sections]
  );

  const currentSection = sections[sectionIndex];
  const historySection = sections[historySectionIndex];

  const handleToggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCategoryToggle = (categoryName: string) => {
    const category = checkCategories.find(c => c.name === categoryName);
    if (!category) return;
    const itemIds = category.items.map(i => i.id);
    const allSelected = itemIds.every(id => selectedItems.includes(id));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  const allCheckItemList = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    checkCategories.forEach(cat => cat.items.forEach(i => items.push({ id: i.id, name: i.name })));
    return items;
  }, [checkCategories]);

  const previewData = useMemo(() => {
    const allItems = checkCategories.flatMap(cat => cat.items);
    return selectedItems.map(id => {
      const item = allItems.find(i => i.id === id);
      if (!item) return null;
      const count = 2 + (id.charCodeAt(id.length - 1) % 3);
      return { name: item.name, count, standard: item.standard };
    }).filter(Boolean);
  }, [selectedItems, checkCategories]);

  const historyStats = useMemo(() => {
    if (!historySection) return { rectifying: 0, pending: 0, approved: 0, rejected: 0, observing: 0, total: 0 };
    const key = `${historySection.id} ${historySection.project}`;
    const sectionTasks = tasks.filter(t => t.sectionName.includes(historySection.id) || t.sectionName.includes(historySection.name));
    const filtered = historyFilterItemId === ALL_FILTER
      ? sectionTasks
      : sectionTasks.filter(t => t.checkItemIds.includes(historyFilterItemId));
    const s = { rectifying: 0, pending_sign: 0, approved: 0, rejected: 0, observing: 0, total: filtered.length };
    filtered.forEach(t => {
      if (t.status === 'rectifying' || t.status === 'inspecting') s.rectifying++;
      if (t.status === 'pending_sign') s.pending_sign++;
      if (t.status === 'signed' && t.signResult === 'approved') s.approved++;
      if (t.status === 'signed' && t.signResult === 'rejected') s.rejected++;
      if (t.status === 'signed' && t.signResult === 'observing') s.observing++;
    });
    return { ...s, pending: s.pending_sign };
  }, [tasks, historySection, historyFilterItemId]);

  const historyTaskList = useMemo(() => {
    if (!historySection) return [];
    const key = `${historySection.id} ${historySection.project}`;
    const sectionTasks = tasks.filter(
      t => t.sectionName.includes(historySection.name) || t.sectionName.includes(historySection.project)
    );
    const filtered = historyFilterItemId === ALL_FILTER
      ? sectionTasks
      : sectionTasks.filter(t => t.checkItemIds.includes(historyFilterItemId));
    return filtered.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [tasks, historySection, historyFilterItemId]);

  const displayHistory = useMemo(() => {
    return showAllHistory ? historyTaskList : historyTaskList.slice(0, 3);
  }, [historyTaskList, showAllHistory]);

  const handleStart = () => {
    if (!currentSection || selectedItems.length === 0) return;
    const taskId = createTask(
      currentSection.id,
      `${currentSection.name} ${currentSection.project}`,
      selectedItems
    );
    console.info('[Sampling] Created task:', taskId);
    Taro.switchTab({ url: '/pages/verify/index' });
  };

  const handleOpenTask = (taskId: string, status: string) => {
    if (status === 'signed') {
      Taro.navigateTo({ url: `/pages/signoff-detail/index?taskId=${taskId}` });
    } else {
      Taro.navigateTo({ url: `/pages/verify-detail/index?taskId=${taskId}` });
    }
  };

  const handleOpenAllSignoffs = () => {
    Taro.switchTab({ url: '/pages/signoff/index' });
  };

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.greeting}>监理巡查抽检</Text>
        <Text className={styles.dateText}>{today}</Text>
      </View>

      <View className={styles.body}>
        <View className={styles.historyCard}>
          <View className={styles.historyHeader}>
            <Text className={styles.historyTitle}>
              <Text className={styles.historyIcon}>📊</Text>
              标段历史记录
            </Text>
            <Text
              className={styles.historyToggle}
              onClick={() => setShowHistory(h => !h)}
            >
              {showHistory ? '收起' : '展开'}
            </Text>
          </View>

          {showHistory && (
            <>
              <View className={styles.historyPickerRow}>
                <Picker
                  mode="selector"
                  range={sectionNames}
                  value={historySectionIndex}
                  onChange={e => { setHistorySectionIndex(Number(e.detail.value)); setShowAllHistory(false); }}
                >
                  <View className={styles.historyPicker}>
                    <Text className={styles.historyPickerValue}>{sectionNames[historySectionIndex]}</Text>
                    <Text className={styles.pickerArrow}>▼</Text>
                  </View>
                </Picker>
              </View>

              <View className={styles.historyFilterBar}>
                <Text
                  className={classnames(
                    styles.historyFilterItem,
                    historyFilterItemId === ALL_FILTER && styles.historyFilterItemActive,
                  )}
                  onClick={() => setHistoryFilterItemId(ALL_FILTER)}
                >
                  全部检查项
                </Text>
                {allCheckItemList.map(item => (
                  <Text
                    key={item.id}
                    className={classnames(
                      styles.historyFilterItem,
                      historyFilterItemId === item.id && styles.historyFilterItemActive,
                    )}
                    onClick={() => setHistoryFilterItemId(item.id)}
                  >
                    {item.name}
                  </Text>
                ))}
              </View>

              <View className={styles.historyStatsRow}>
                <View className={styles.historyStatCard}>
                  <Text className={classnames(styles.historyStatNum, styles.historyStatNumRectify)}>{historyStats.rectifying}</Text>
                  <Text className={styles.historyStatLabel}>待整改</Text>
                </View>
                <View className={styles.historyStatCard}>
                  <Text className={classnames(styles.historyStatNum, styles.historyStatNumPending)}>{historyStats.pending}</Text>
                  <Text className={styles.historyStatLabel}>待签认</Text>
                </View>
                <View className={styles.historyStatCard}>
                  <Text className={classnames(styles.historyStatNum, styles.historyStatNumApproved)}>{historyStats.approved}</Text>
                  <Text className={styles.historyStatLabel}>已通过</Text>
                </View>
                <View className={styles.historyStatCard}>
                  <Text className={classnames(styles.historyStatNum, styles.historyStatNumRejected)}>{historyStats.rejected + historyStats.observing}</Text>
                  <Text className={styles.historyStatLabel}>退回/观察</Text>
                </View>
              </View>

              <ScrollView scrollY className={styles.historyTaskList}>
                {displayHistory.length === 0 && (
                  <View className={styles.historyTaskEmpty}>
                    <Text>该筛选条件下暂无历史记录</Text>
                  </View>
                )}
                {displayHistory.map(task => (
                  <View
                    key={task.id}
                    className={styles.historyTaskCard}
                    onClick={() => handleOpenTask(task.id, task.status)}
                  >
                    <View className={styles.historyTaskHead}>
                      <Text className={styles.historyTaskDate}>{task.date}</Text>
                      <StatusTag status={task.status} />
                    </View>
                    <Text className={styles.historyTaskMeta}>
                      点位{task.points.length}个 · 偏差{task.points.filter(p => p.isDeviation).length}个
                      {task.status === 'signed' && task.signResult && (
                        ` · 签认：${task.signResult === 'approved' ? '通过' : task.signResult === 'rejected' ? '退回' : '观察'}`
                      )}
                    </Text>
                    {task.points.filter(p => p.isDeviation).length > 0 && (
                      <Text className={styles.historyTaskDeviation}>
                        ⚠️ 含偏差项，点击查看完整闭环记录
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>

              {historyTaskList.length > 3 && (
                <Button
                  className={styles.historyShowAllBtn}
                  onClick={() => {
                    if (showAllHistory) {
                      setShowAllHistory(false);
                    } else {
                      if (historyTaskList.length > 10) {
                        handleOpenAllSignoffs();
                      } else {
                        setShowAllHistory(true);
                      }
                    }
                  }}
                >
                  {showAllHistory
                    ? '收起列表'
                    : historyTaskList.length > 10
                      ? `查看全部 ${historyTaskList.length} 条记录 →`
                      : `展开剩余 ${historyTaskList.length - 3} 条`}
                </Button>
              )}
            </>
          )}
        </View>

        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionTitleIcon}>📍</Text>
            选择巡查标段
          </Text>
          <Picker
            mode="selector"
            range={sectionNames}
            value={sectionIndex}
            onChange={e => setSectionIndex(Number(e.detail.value))}
          >
            <View className={styles.pickerTrigger}>
              <Text className={styles.pickerValue}>
                {sectionNames[sectionIndex]}
              </Text>
              <Text className={styles.pickerArrow}>▼</Text>
            </View>
          </Picker>
        </View>

        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionTitleIcon}>✅</Text>
            勾选检查部位
          </Text>
          {checkCategories.map(category => (
            <View key={category.name} className={styles.categorySection}>
              <Text
                className={styles.categoryTitle}
                onClick={() => handleCategoryToggle(category.name)}
              >
                {category.name}
              </Text>
              {category.items.map(item => (
                <CheckItemCard
                  key={item.id}
                  item={item}
                  checked={selectedItems.includes(item.id)}
                  onToggle={handleToggleItem}
                />
              ))}
            </View>
          ))}
        </View>

        {selectedItems.length > 0 && (
          <View className={styles.pointsPreview}>
            <Text className={styles.previewTitle}>📋 自动生成抽检点预览</Text>
            <View className={styles.previewList}>
              {previewData.map((item, idx) => (
                <View key={idx} className={styles.previewItem}>
                  <Text className={styles.previewItemName}>{item!.name}</Text>
                  <Text className={styles.previewItemCount}>
                    生成 {item!.count} 个抽检点（标准{item!.standard}）
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedItems.length === 0 && (
          <View className={styles.pointsPreview}>
            <Text className={styles.emptyHint}>请先选择检查部位，系统将自动生成随机抽检点</Text>
          </View>
        )}
      </View>

      <View className={styles.bottomBar}>
        <Button
          className={classnames(
            styles.startButton,
            selectedItems.length === 0 && styles.startButtonDisabled
          )}
          onClick={handleStart}
          disabled={selectedItems.length === 0}
        >
          开始抽检（{selectedItems.length}项）
        </Button>
      </View>
    </View>
  );
};

export default SamplingPage;

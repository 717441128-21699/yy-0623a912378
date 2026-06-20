import React, { useState, useMemo } from 'react';
import { View, Text, Button, Picker, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import StatusTag from '@/components/StatusTag';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

type StatusFilter = 'all' | 'pending_sign' | 'signed';
type SignFilter = 'all' | 'approved' | 'rejected' | 'observing';

const ALL_SECTIONS = '__all_sections__';
const ALL_ITEMS = '__all__';

const formatMonthLabel = (ym: string): string => {
  const [y, m] = ym.split('-');
  return `${y}年${m}月`;
};

const SignoffPage: React.FC = () => {
  const { tasks, sections, checkCategories } = useInspectionStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [signFilter, setSignFilter] = useState<SignFilter>('all');
  const [projectIndex, setProjectIndex] = useState(0);
  const [sectionFilterId, setSectionFilterId] = useState<string>(ALL_SECTIONS);
  const [checkItemFilter, setCheckItemFilter] = useState<string>(ALL_ITEMS);
  const [monthFilter, setMonthFilter] = useState<string>('__all_months__');
  const [showArchive, setShowArchive] = useState(true);

  const projectList = useMemo(() => {
    const map = new Map<string, string[]>();
    sections.forEach(s => {
      if (!map.has(s.project)) map.set(s.project, []);
      map.get(s.project)!.push(s.id);
    });
    const list: { name: string; sectionIds: string[] }[] = [];
    map.forEach((sectionIds, name) => list.push({ name, sectionIds }));
    return list;
  }, [sections]);

  const projectPickerOptions = useMemo(() => {
    return ['全部项目', ...projectList.map(p => p.name)];
  }, [projectList]);

  const availableSections = useMemo(() => {
    if (projectIndex === 0) return sections;
    const target = projectList[projectIndex - 1];
    if (!target) return [];
    return sections.filter(s => target.sectionIds.includes(s.id));
  }, [sections, projectIndex, projectList]);

  const sectionPickerOptions = useMemo(() => {
    return ['全部标段', ...availableSections.map(s => `${s.name} (${s.project})`)];
  }, [availableSections]);

  const checkItemList = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    checkCategories.forEach(cat => cat.items.forEach(i => items.push({ id: i.id, name: i.name })));
    return items;
  }, [checkCategories]);

  const allSignTasks = useMemo(
    () => tasks.filter(t => t.status === 'pending_sign' || t.status === 'signed'),
    [tasks]
  );

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.date) {
        const ym = t.date.slice(0, 7);
        if (ym) set.add(ym);
      }
      if (t.signDate) {
        const ym = t.signDate.slice(0, 7);
        if (ym) set.add(ym);
      }
    });
    return ['全部月份', ...Array.from(set).sort().reverse()];
  }, [tasks]);

  const monthSummary = useMemo(() => {
    const result: Record<string, { total: number; deviation: number; rectified: number; pendingRetest: number; pendingSign: number; rejected: number; observing: number; approved: number }> = {};
    tasks.forEach(task => {
      const ym = task.date ? task.date.slice(0, 7) : (task.signDate ? task.signDate.slice(0, 7) : null);
      if (!ym) return;
      if (!result[ym]) {
        result[ym] = { total: 0, deviation: 0, rectified: 0, pendingRetest: 0, pendingSign: 0, rejected: 0, observing: 0, approved: 0 };
      }
      result[ym].total++;
      const hasDeviation = task.points.some(p => p.isDeviation);
      if (hasDeviation) result[ym].deviation++;
      if (task.status === 'rectifying' || task.status === 'inspecting') {
        const allDeviationPoints = task.points.filter(p => p.isDeviation);
        const hasRetest = allDeviationPoints.some(p => p.retestValue);
        if (hasRetest) {
          result[ym].rectified++;
        } else {
          result[ym].pendingRetest++;
        }
      }
      if (task.status === 'pending_sign') result[ym].pendingSign++;
      if (task.status === 'signed') {
        if (task.signResult === 'approved') result[ym].approved++;
        if (task.signResult === 'rejected') result[ym].rejected++;
        if (task.signResult === 'observing') result[ym].observing++;
      }
    });
    return result;
  }, [tasks]);

  const latestMonth = useMemo(() => {
    const months = Object.keys(monthSummary).sort().reverse();
    return months[0] || null;
  }, [monthSummary]);

  const currentMonthStats = useMemo(() => {
    if (monthFilter === '__all_months__' || !monthFilter) {
      return latestMonth ? monthSummary[latestMonth] : null;
    }
    return monthSummary[monthFilter] || null;
  }, [monthFilter, latestMonth, monthSummary]);

  const currentMonthLabel = useMemo(() => {
    if (monthFilter === '__all_months__' || !monthFilter) {
      return latestMonth ? formatMonthLabel(latestMonth) : '';
    }
    return formatMonthLabel(monthFilter);
  }, [monthFilter, latestMonth]);

  const filteredTasks = useMemo(() => {
    let list = allSignTasks;
    if (statusFilter !== 'all') {
      list = list.filter(t => t.status === statusFilter);
    }
    if (signFilter !== 'all') {
      list = list.filter(t => t.status === 'signed' && t.signResult === signFilter);
    }
    if (projectIndex > 0) {
      const target = projectList[projectIndex - 1];
      if (target) {
        list = list.filter(t => {
          const matching = sections.find(s => target.sectionIds.includes(s.id));
          if (!matching) return false;
          return t.sectionName.includes(matching.name) || t.sectionName.includes(matching.project);
        });
      }
    }
    if (sectionFilterId !== ALL_SECTIONS) {
      const sec = sections.find(s => s.id === sectionFilterId);
      if (sec) {
        list = list.filter(t =>
          t.sectionName.includes(sec.name) || t.sectionName.includes(sec.project)
        );
      }
    }
    if (checkItemFilter !== ALL_ITEMS) {
      list = list.filter(t => t.checkItemIds.includes(checkItemFilter));
    }
    if (monthFilter !== '__all_months__' && monthFilter) {
      list = list.filter(t => {
        const taskMonth = t.date ? t.date.slice(0, 7) : (t.signDate ? t.signDate.slice(0, 7) : null);
        return taskMonth === monthFilter;
      });
    }
    return list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [
    allSignTasks, statusFilter, signFilter, projectIndex, sectionFilterId,
    checkItemFilter, monthFilter, sections, projectList,
  ]);

  const stats = useMemo(() => ({
    pending: allSignTasks.filter(t => t.status === 'pending_sign').length,
    approved: allSignTasks.filter(t => t.status === 'signed' && t.signResult === 'approved').length,
    rejected: allSignTasks.filter(t => t.status === 'signed' && t.signResult === 'rejected').length,
    observing: allSignTasks.filter(t => t.status === 'signed' && t.signResult === 'observing').length,
  }), [allSignTasks]);

  const handleSignoff = (taskId: string) => {
    Taro.navigateTo({ url: `/pages/signoff-detail/index?taskId=${taskId}` });
  };

  const handleJumpMonthStat = (type: 'pending_sign' | 'rectifying' | 'approved' | 'rejected' | 'observing') => {
    if (type === 'pending_sign') {
      setStatusFilter('pending_sign');
      setSignFilter('all');
    } else if (type === 'rectifying') {
      Taro.switchTab({ url: '/pages/verify/index' });
    } else if (type === 'approved' || type === 'rejected' || type === 'observing') {
      setStatusFilter('signed');
      setSignFilter(type);
    }
  };

  const handleSectionChange = (idx: number) => {
    if (idx === 0) {
      setSectionFilterId(ALL_SECTIONS);
    } else {
      const sec = availableSections[idx - 1];
      if (sec) setSectionFilterId(sec.id);
    }
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
        <View className={styles.monthSummaryCard}>
          <View className={styles.monthSummaryHeader}>
            <Text className={styles.monthSummaryTitle}>
              📅 {currentMonthLabel}月度闭环汇总
            </Text>
            <Picker
              mode="selector"
              range={monthOptions}
              value={Math.max(0, monthOptions.findIndex(m => (m === '__all_months__' && monthFilter === '__all_months__') || m === monthFilter))}
              onChange={e => {
                const picked = monthOptions[Number(e.detail.value)];
                setMonthFilter(picked === '全部月份' ? '__all_months__' : picked);
              }}
            >
              <View className={styles.monthPickerBtn}>
                <Text className={styles.monthPickerText}>切换月份 ▼</Text>
              </View>
            </Picker>
          </View>

          {currentMonthStats && (
            <View className={styles.monthStatGrid}>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemTotal)}
                onClick={() => { setStatusFilter('all'); setSignFilter('all'); }}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.total}</Text>
                <Text className={styles.monthStatLabel}>抽检总数</Text>
              </View>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemDeviation)}
                onClick={() => { setStatusFilter('all'); setSignFilter('all'); }}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.deviation}</Text>
                <Text className={styles.monthStatLabel}>偏差点</Text>
              </View>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemRectify)}
                onClick={() => handleJumpMonthStat('rectifying')}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.rectified}</Text>
                <Text className={styles.monthStatLabel}>已整改</Text>
              </View>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemPendingRetest)}
                onClick={() => handleJumpMonthStat('rectifying')}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.pendingRetest}</Text>
                <Text className={styles.monthStatLabel}>待复测</Text>
              </View>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemPendingSign)}
                onClick={() => handleJumpMonthStat('pending_sign')}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.pendingSign}</Text>
                <Text className={styles.monthStatLabel}>待签认</Text>
              </View>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemApproved)}
                onClick={() => handleJumpMonthStat('approved')}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.approved}</Text>
                <Text className={styles.monthStatLabel}>已通过</Text>
              </View>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemRejected)}
                onClick={() => handleJumpMonthStat('rejected')}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.rejected}</Text>
                <Text className={styles.monthStatLabel}>退回</Text>
              </View>
              <View
                className={classnames(styles.monthStatItem, styles.monthStatItemObserving)}
                onClick={() => handleJumpMonthStat('observing')}
              >
                <Text className={styles.monthStatNum}>{currentMonthStats.observing}</Text>
                <Text className={styles.monthStatLabel}>观察</Text>
              </View>
            </View>
          )}

          {!currentMonthStats && (
            <View className={styles.monthEmpty}>
              <Text className={styles.monthEmptyText}>该月份暂无闭环记录</Text>
            </View>
          )}
        </View>

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
          <View className={styles.archiveHeader}>
            <Text className={styles.archiveTitle}>
              <Text className={styles.archiveIcon}>🗂️</Text>
              归档台账筛选
            </Text>
            <Text
              className={styles.archiveToggle}
              onClick={() => setShowArchive(v => !v)}
            >
              {showArchive ? '收起' : '展开'}
            </Text>
          </View>

          {showArchive && (
            <>
              <View className={styles.archivePickerRow}>
                <Picker
                  mode="selector"
                  range={projectPickerOptions}
                  value={projectIndex}
                  onChange={e => {
                    setProjectIndex(Number(e.detail.value));
                    setSectionFilterId(ALL_SECTIONS);
                  }}
                >
                  <View className={styles.archivePicker}>
                    <Text className={styles.archivePickerValue}>{projectPickerOptions[projectIndex]}</Text>
                    <Text className={styles.pickerArrow}>▼</Text>
                  </View>
                </Picker>
              </View>
              <View className={styles.archivePickerRow}>
                <Picker
                  mode="selector"
                  range={sectionPickerOptions}
                  value={sectionFilterId === ALL_SECTIONS ? 0 : Math.max(0, availableSections.findIndex(s => s.id === sectionFilterId) + 1)}
                  onChange={e => handleSectionChange(Number(e.detail.value))}
                >
                  <View className={styles.archivePicker}>
                    <Text className={styles.archivePickerValue}>
                      {sectionFilterId === ALL_SECTIONS ? sectionPickerOptions[0] : sectionPickerOptions[Math.max(0, availableSections.findIndex(s => s.id === sectionFilterId) + 1)]}
                    </Text>
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
                      signFilter === 'approved' && styles.archiveFilterItemApprovedActive,
                    )}
                    onClick={() => setSignFilter('approved')}
                  >
                    ✅ 通过
                  </Text>
                  <Text
                    className={classnames(
                      styles.archiveFilterItem,
                      signFilter === 'rejected' && styles.archiveFilterItemRejectedActive,
                    )}
                    onClick={() => setSignFilter('rejected')}
                  >
                    ❌ 退回
                  </Text>
                  <Text
                    className={classnames(
                      styles.archiveFilterItem,
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
                {projectIndex > 0 && ` · ${projectPickerOptions[projectIndex]}`}
                {sectionFilterId !== ALL_SECTIONS && availableSections.find(s => s.id === sectionFilterId) && (
                  ` · ${availableSections.find(s => s.id === sectionFilterId)?.name}`
                )}
                {checkItemFilter !== ALL_ITEMS && (
                  ` · ${checkItemList.find(i => i.id === checkItemFilter)?.name || ''}`
                )}
                {signFilter !== 'all' && (
                  ` · ${signFilter === 'approved' ? '通过' : signFilter === 'rejected' ? '退回' : '观察'}`
                )}
                {monthFilter !== '__all_months__' && monthFilter && ` · ${formatMonthLabel(monthFilter)}`}
              </Text>
            </>
          )}
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

import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const buildFullReport = (task: any) => {
  const lines: string[] = [];
  lines.push('==== 质量实测实量闭环记录报告 ====');
  lines.push(`标段：${task.sectionName}`);
  lines.push(`抽检日期：${task.date}`);
  lines.push(`抽检点数：${task.points.length}个`);
  const deviations = task.points.filter((p: any) => p.isDeviation);
  lines.push(`偏差点数：${deviations.length}个`);
  lines.push('-------------------------------');
  task.points.forEach((p: any, idx: number) => {
    lines.push(`【点位${idx + 1}】${p.checkItemName}（${p.location}）`);
    lines.push(`  标准值：≤${p.standardValue}mm | 实测值：${p.measuredValue}mm | ${p.isDeviation ? '⚠️偏差' : '✅合格'}`);
    if (p.isDeviation && p.retestValue) {
      lines.push(`  复测值：${p.retestValue}mm（${p.retestDate || '复测已提交'}${p.retestInspector ? ' · 复测人：' + p.retestInspector : ''}）`);
    }
    if (p.isDeviation && p.rectificationOpinion) {
      lines.push(`  整改意见：${p.rectificationOpinion}`);
      if (p.rectificationDeadline) lines.push(`  整改期限：${p.rectificationDeadline}`);
    }
    if (p.photos && p.photos.length > 0) lines.push(`  原始照片：${p.photos.length}张`);
    if (p.isDeviation && p.retestPhotos && p.retestPhotos.length > 0) lines.push(`  复测照片：${p.retestPhotos.length}张`);
    lines.push('');
  });
  if (task.status === 'signed') {
    lines.push('-------------------------------');
    lines.push(`签认结果：${task.signResult === 'approved' ? '✅ 通过' : task.signResult === 'rejected' ? '❌ 退回' : '👁️ 继续观察'}`);
    if (task.signDate) lines.push(`签认日期：${task.signDate}`);
    if (task.supervisorName) lines.push(`监理：${task.supervisorName}`);
    if (task.signComment) lines.push(`签认意见：${task.signComment}`);
    lines.push('================================');
  }
  return lines.join('\n');
};

const buildBriefText = (task: any) => {
  const lines: string[] = [];
  lines.push('==== 质量实测实量闭环留档摘要 ====');
  lines.push(`标段：${task.sectionName} | 日期：${task.date}`);
  lines.push(`共${task.points.length}点，合格${task.points.filter((p: any) => !p.isDeviation).length}点，偏差${task.points.filter((p: any) => p.isDeviation).length}点`);
  task.points.forEach((p: any, idx: number) => {
    if (!p.isDeviation) return;
    lines.push(`  ▸点位${idx + 1}-${p.checkItemName}(${p.location}):实测${p.measuredValue}/标准${p.standardValue}`);
    if (p.retestValue) lines.push(`    →复测${p.retestValue}（${p.retestDate || ''}${p.retestInspector ? '，' + p.retestInspector : ''}）`);
    if (p.rectificationDeadline) lines.push(`    →整改期限：${p.rectificationDeadline}`);
  });
  if (task.status === 'signed') {
    const s = task.signResult === 'approved' ? '通过' : task.signResult === 'rejected' ? '退回' : '观察';
    lines.push(`签认：${s}${task.signDate ? '（' + task.signDate + '）' : ''}${task.signComment ? ' - ' + task.signComment : ''}`);
  }
  lines.push('==================================');
  return lines.join('\n');
};

const buildSupervisorLogText = (task: any) => {
  const deviationPoints = task.points.filter((p: any) => p.isDeviation);
  const lines: string[] = [];
  lines.push(`【监理日志-${task.date}】${task.sectionName} 质量实测实量巡查`);
  lines.push(`  今日对${task.sectionName}进行实测实量抽查，共抽检${task.points.length}个点位：`);
  lines.push(`  ▫合格：${task.points.length - deviationPoints.length}点`);
  lines.push(`  ▫偏差：${deviationPoints.length}点`);
  deviationPoints.forEach((p: any, idx: number) => {
    lines.push(`  【问题${idx + 1}】${p.checkItemName}（${p.location}）`);
    lines.push(`    ·实测数据：${p.measuredValue}mm，允许偏差≤${p.standardValue}mm`);
    lines.push(`    ·现场照片：${p.photos?.length || 0}张，附整改前后对比：整改前${p.photos?.length || 0}张${p.retestPhotos && p.retestPhotos.length ? '/整改后' + p.retestPhotos.length + '张' : ''}`);
    if (p.rectificationOpinion) lines.push(`    ·整改要求：${p.rectificationOpinion}`);
    if (p.rectificationDeadline) lines.push(`    ·整改期限：${p.rectificationDeadline}`);
    if (p.retestValue) lines.push(`    ·复测结果：${p.retestValue}mm（${p.retestDate || '已复测'}${p.retestInspector ? '，陪检：' + p.retestInspector : ''}）`);
  });
  if (task.status === 'signed' && task.signComment) {
    lines.push(`  ·签认意见：${task.signComment}`);
  }
  if (task.supervisorName) {
    lines.push(`  ·监理签字：${task.supervisorName}`);
  }
  return lines.join('\n');
};

const buildSinglePointDigest = (task: any, point: any, idx: number) => {
  const lines: string[] = [];
  lines.push(`【点位留档-${idx + 1}】${task.date} ${task.sectionName}`);
  lines.push(`  检查项：${point.checkItemName} | 部位：${point.location}`);
  lines.push(`  标准值：≤${point.standardValue}mm | 实测值：${point.measuredValue}mm | ${point.isDeviation ? '⚠️偏差' : '✅合格'}`);
  if (point.isDeviation) {
    if (point.rectificationOpinion) lines.push(`  整改意见：${point.rectificationOpinion}`);
    if (point.rectificationDeadline) lines.push(`  整改期限：${point.rectificationDeadline}`);
    if (point.retestValue) {
      lines.push(`  复测值：${point.retestValue}mm | 日期：${point.retestDate || '-'}${point.retestInspector ? ' | 复测人：' + point.retestInspector : ''}`);
    }
    lines.push(`  原始照片：${point.photos?.length || 0}张${point.retestPhotos?.length ? ' | 复测照片：' + point.retestPhotos.length + '张' : ''}`);
  }
  return lines.join('\n');
};

const SignoffDetailPage: React.FC = () => {
  const router = useRouter();
  const taskId = router.params.taskId || '';
  const { tasks, signOff, revertForReRectify } = useInspectionStore();
  const task = tasks.find(t => t.id === taskId);

  const [comment, setComment] = useState('');
  const [selectedDigestIdx, setSelectedDigestIdx] = useState<number | null>(null);

  const reportSummary = useMemo(() => {
    if (!task) return null;
    const total = task.points.length;
    const passed = task.points.filter(p => !p.isDeviation).length;
    const deviated = task.points.filter(p => p.isDeviation).length;
    const retested = task.points.filter(p => p.isDeviation && p.retestValue).length;
    return { total, passed, deviated, retested };
  }, [task]);

  const timeline = useMemo(() => {
    if (!task) return [];
    const items: { date: string; label: string; desc: string; icon: string; color: string }[] = [];
    items.push({
      date: task.date,
      label: '创建抽检任务',
      desc: `共${task.points.length}个抽检点${task.supervisorName ? '，监理：' + task.supervisorName : ''}`,
      icon: '📝',
      color: 'primary',
    });
    const anyMeasured = task.points.some(p => p.measuredValue);
    if (anyMeasured || task.status !== 'planned') {
      items.push({
        date: task.date,
        label: '现场复核',
        desc: `录入${task.points.filter(p => p.measuredValue).length}个实测值，偏差${task.points.filter(p => p.isDeviation).length}个`,
        icon: '🔍',
        color: 'inspecting',
      });
    }
    const anyOpinion = task.points.some(p => p.rectificationOpinion);
    if (anyOpinion) {
      const samplePoint = task.points.find(p => p.rectificationOpinion);
      items.push({
        date: samplePoint?.rectificationDeadline ? `截止 ${samplePoint.rectificationDeadline}` : task.date,
        label: '下发整改通知',
        desc: `共${task.points.filter(p => p.rectificationOpinion).length}条整改意见${samplePoint?.rectificationDeadline ? '，整改期限' + samplePoint.rectificationDeadline : ''}`,
        icon: '📋',
        color: 'rectifying',
      });
    }
    const anyRetest = task.points.some(p => p.retestValue);
    if (anyRetest) {
      const latestDate = task.points
        .filter(p => p.retestDate)
        .map(p => p.retestDate)
        .sort()
        .reverse()[0] || task.date;
      items.push({
        date: latestDate,
        label: '提交复测结果',
        desc: `施工方提交${task.points.filter(p => p.retestValue).length}条复测数据，含整改后照片`,
        icon: '🔧',
        color: 'rectifying',
      });
    }
    if (task.status === 'pending_sign') {
      items.push({
        date: '--',
        label: '待监理签认',
        desc: '对比原始数据、复测数据和照片后进行签认',
        icon: '⏳',
        color: 'pending',
      });
    } else if (task.status === 'signed') {
      const resultLabel =
        task.signResult === 'approved' ? '✅签认通过（闭环）' :
        task.signResult === 'rejected' ? '❌签认退回' : '👁️继续观察';
      items.push({
        date: task.signDate || '--',
        label: `完成签认 · ${resultLabel}`,
        desc: task.signComment || '已完成本次闭环签认',
        icon: task.signResult === 'approved' ? '✅' : task.signResult === 'rejected' ? '❌' : '👁️',
        color: task.signResult === 'approved' ? 'approved' : task.signResult === 'rejected' ? 'rejected' : 'observing',
      });
    }
    return items;
  }, [task]);

  const handlePreviewImage = (urls: string[], current: string) => {
    if (!urls || urls.length === 0) return;
    Taro.previewImage({ urls, current });
  };

  const handleCopyReport = () => {
    if (!task) return;
    Taro.setClipboardData({
      data: buildFullReport(task),
      success: () => Taro.showToast({ title: '完整报告已复制', icon: 'success' }),
    });
  };

  const handleExportReport = () => {
    if (!task) return;
    Taro.setClipboardData({
      data: buildBriefText(task),
      success: () => Taro.showToast({ title: '留档摘要已复制', icon: 'success' }),
    });
  };

  const handleCopySupervisorLog = () => {
    if (!task) return;
    Taro.setClipboardData({
      data: buildSupervisorLogText(task),
      success: () => Taro.showToast({ title: '监理日志文字已复制', icon: 'success' }),
    });
  };

  const handleCopySinglePoint = (idx: number) => {
    if (!task) return;
    const point = task.points[idx];
    if (!point) return;
    Taro.setClipboardData({
      data: buildSinglePointDigest(task, point, idx),
      success: () => Taro.showToast({ title: `点位${idx + 1}摘要已复制`, icon: 'success' }),
    });
  };

  const handleToggleDigest = (idx: number) => {
    setSelectedDigestIdx(prev => (prev === idx ? null : idx));
  };

  const handleExpandAllDigests = () => {
    if (!task || task.points.length === 0) return;
    if (selectedDigestIdx === task.points.length - 1) {
      setSelectedDigestIdx(null);
    } else {
      setSelectedDigestIdx(task.points.length - 1);
    }
  };

  const handleSign = (result: 'approved' | 'rejected' | 'observing') => {
    const resultLabel = result === 'approved' ? '通过' : result === 'rejected' ? '退回' : '继续观察';
    Taro.showModal({
      title: '确认签认',
      content: `确认签认结果为"${resultLabel}"？`,
      success: (res) => {
        if (res.confirm) {
          signOff(taskId, result, comment);
          console.info('[Signoff] Signed:', resultLabel);
          Taro.showToast({ title: '签认成功', icon: 'success' });
          setTimeout(() => {
            Taro.switchTab({ url: '/pages/signoff/index' });
          }, 1500);
        }
      },
    });
  };

  const handleReRectify = () => {
    Taro.showModal({
      title: '重新发起整改',
      content: '将退回整改中状态，清空已有复测数据，施工方需重新整改并提交复测？',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          revertForReRectify(taskId);
          Taro.showToast({ title: '已退回整改中', icon: 'success' });
          setTimeout(() => {
            Taro.switchTab({ url: '/pages/verify/index' });
          }, 1200);
        }
      },
    });
  };

  const handlePushToVerify = () => {
    Taro.switchTab({ url: '/pages/verify/index' });
  };

  if (!task) {
    return (
      <View className={styles.container}>
        <View className={styles.taskInfo}>
          <Text className={styles.taskSection}>记录不存在</Text>
        </View>
      </View>
    );
  }

  const isSigned = task.status === 'signed';

  const renderPhotoGrid = (photos: string[], gridTitle: string) => {
    return (
      <View className={styles.photoColumn}>
        <Text className={styles.photoColumnLabel}>{gridTitle}</Text>
        {photos.length > 0 ? (
          <ScrollView scrollX className={styles.photoScroll}>
            <View className={styles.photoScrollInner}>
              {photos.map((photo, idx) => (
                <View key={idx} className={styles.photoTile} onClick={() => handlePreviewImage(photos, photo)}>
                  <Image
                    className={styles.photoTileImg}
                    src={photo}
                    mode="aspectFill"
                  />
                  {photos.length > 1 && (
                    <View className={styles.photoTileBadge}>
                      <Text className={styles.photoTileBadgeText}>{idx + 1}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className={styles.photoEmptyBox}>
            <Text className={styles.photoEmptyText}>暂无照片</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className={styles.container}>
      <View className={styles.taskInfo}>
        <Text className={styles.taskSection}>{task.sectionName}</Text>
        <Text className={styles.taskDate}>抽检日期：{task.date}</Text>
      </View>

      <View className={styles.body}>
        <Text className={styles.sectionTitle}>⏱️ 闭环时间线</Text>
        <View className={styles.timelineContainer}>
          {timeline.map((t, idx) => (
            <View
              key={idx}
              className={classnames(
                styles.timelineItem,
                idx === timeline.length - 1 && styles.timelineItemLast,
                styles[`timelineItem${t.color.charAt(0).toUpperCase() + t.color.slice(1)}`],
              )}
            >
              <View className={styles.timelineIcon}>
                <Text className={styles.timelineIconText}>{t.icon}</Text>
              </View>
              <View className={styles.timelineContent}>
                <View className={styles.timelineHeader}>
                  <Text className={styles.timelineLabel}>{t.label}</Text>
                  <Text className={styles.timelineDate}>{t.date}</Text>
                </View>
                <Text className={styles.timelineDesc}>{t.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {isSigned && reportSummary && (
          <View className={styles.reportSection}>
            <View className={styles.reportHeader}>
              <Text className={styles.reportTitle}>📄 闭环记录报告</Text>
              {task.signDate && (
                <Text className={styles.reportMeta}>签认于 {task.signDate}</Text>
              )}
            </View>

            <View className={styles.reportSummaryRow}>
              <View className={styles.reportSummaryItem}>
                <Text className={styles.reportSummaryNum}>{reportSummary.total}</Text>
                <Text className={styles.reportSummaryLabel}>总点位</Text>
              </View>
              <View className={styles.reportSummaryItem}>
                <Text className={classnames(styles.reportSummaryNum, styles.reportSummaryNumPass)}>{reportSummary.passed}</Text>
                <Text className={styles.reportSummaryLabel}>合格</Text>
              </View>
              <View className={styles.reportSummaryItem}>
                <Text className={classnames(styles.reportSummaryNum, styles.reportSummaryNumFail)}>{reportSummary.deviated}</Text>
                <Text className={styles.reportSummaryLabel}>偏差</Text>
              </View>
              <View className={styles.reportSummaryItem}>
                <Text className={classnames(styles.reportSummaryNum, styles.reportSummaryNumRectify)}>{reportSummary.retested}</Text>
                <Text className={styles.reportSummaryLabel}>已复测</Text>
              </View>
            </View>

            <View className={styles.reportContent}>
              {task.points.map((point, index) => {
                const isOpen = selectedDigestIdx === index;
                return (
                  <View key={point.id} className={styles.reportItem}>
                    <View
                      className={styles.reportItemHead}
                      onClick={() => handleToggleDigest(index)}
                    >
                      <View style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                        <Text className={styles.reportItemIndex}>{index + 1}</Text>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text className={styles.reportItemName}>{point.checkItemName}</Text>
                          <Text className={styles.reportItemLocation}>{point.location}</Text>
                        </View>
                      </View>
                      <Text className={classnames(
                        styles.reportItemTag,
                        point.isDeviation ? styles.reportItemTagFail : styles.reportItemTagPass,
                      )}>
                        {isOpen ? '🔼收起' : point.isDeviation ? '🔽偏差' : '🔽合格'}
                      </Text>
                    </View>

                    {isOpen && (
                      <>
                        <View className={styles.reportItemDataRow}>
                          <View className={styles.reportItemData}>
                            <Text className={styles.reportItemDataLabel}>标准值</Text>
                            <Text className={styles.reportItemDataValue}>≤{point.standardValue}</Text>
                          </View>
                          <View className={styles.reportItemData}>
                            <Text className={styles.reportItemDataLabel}>实测值</Text>
                            <Text className={classnames(
                              styles.reportItemDataValue,
                              point.isDeviation && styles.reportItemDataValueOriginal,
                            )}>{point.measuredValue}</Text>
                          </View>
                          {point.isDeviation && point.retestValue && (
                            <View className={styles.reportItemData}>
                              <Text className={styles.reportItemDataLabel}>复测值</Text>
                              <Text className={classnames(styles.reportItemDataValue, styles.reportItemDataValueRetest)}>
                                {point.retestValue}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View className={styles.reportItemPhotos}>
                          <View className={styles.reportItemPhotoTag}>
                            <Text className={styles.reportItemPhotoTagLabel}>原始照片</Text>
                            <Text className={styles.reportItemPhotoTagValue}>{point.photos?.length || 0}张</Text>
                          </View>
                          {point.isDeviation && (
                            <View className={styles.reportItemPhotoTag}>
                              <Text className={styles.reportItemPhotoTagLabel}>复测照片</Text>
                              <Text className={styles.reportItemPhotoTagValue}>{point.retestPhotos?.length || 0}张</Text>
                            </View>
                          )}
                        </View>

                        {point.isDeviation && point.rectificationOpinion && (
                          <View className={styles.reportItemOpinion}>
                            <Text className={styles.reportItemOpinionLabel}>整改意见：</Text>
                            <Text className={styles.reportItemOpinionText}>{point.rectificationOpinion}</Text>
                            {point.rectificationDeadline && (
                              <Text className={styles.reportItemOpinionText} style={{ marginTop: 4 }}>
                                整改期限：{point.rectificationDeadline}
                                {point.retestInspector ? ` · 复测人：${point.retestInspector}` : ''}
                              </Text>
                            )}
                          </View>
                        )}

                        <View className={styles.reportItemActions}>
                          <Button
                            className={styles.reportItemCopyBtn}
                            onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleCopySinglePoint(index); }}
                          >
                            📋 复制点位{index + 1}留档摘要
                          </Button>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            <View className={styles.reportFooter}>
              <View className={styles.reportSignRow}>
                <Text className={styles.reportSignLabel}>抽检日期</Text>
                <Text className={styles.reportSignValue}>{task.date}</Text>
              </View>
              <View className={styles.reportSignRow}>
                <Text className={styles.reportSignLabel}>监理</Text>
                <Text className={styles.reportSignValue}>{task.supervisorName || '未记录'}</Text>
              </View>
              <View className={styles.reportSignRow}>
                <Text className={styles.reportSignLabel}>签认结果</Text>
                <Text className={classnames(
                  styles.reportSignValue,
                  task.signResult === 'approved' && styles.reportSignValueApproved,
                  task.signResult === 'rejected' && styles.reportSignValueRejected,
                  task.signResult === 'observing' && styles.reportSignValueObserving,
                )}>
                  {task.signResult === 'approved' ? '✅ 通过（闭环）' : task.signResult === 'rejected' ? '❌ 退回（重新整改）' : '👁️ 继续观察'}
                </Text>
              </View>
              {task.signComment && (
                <View className={styles.reportComment}>
                  <Text className={styles.reportCommentLabel}>签认意见</Text>
                  <Text className={styles.reportCommentText}>{task.signComment}</Text>
                </View>
              )}
            </View>

            <View className={styles.reportActions}>
              <Button className={classnames(styles.reportActionBtn, styles.reportActionCopy)} onClick={handleCopyReport}>
                📋 复制完整报告
              </Button>
              <Button className={classnames(styles.reportActionBtn, styles.reportActionExport)} onClick={handleExportReport}>
                📝 复制留档摘要
              </Button>
            </View>
            <View className={styles.reportActions}>
              <Button className={classnames(styles.reportActionBtn, styles.reportActionSupervisor)} onClick={handleCopySupervisorLog}>
                📓 复制监理日志文字
              </Button>
              <Button
                className={classnames(styles.reportActionBtn, styles.reportActionSecondary)}
                onClick={handleExpandAllDigests}
              >
                {selectedDigestIdx !== null ? '🔼 收起点位摘要' : '🔽 展开点位摘要'}
              </Button>
            </View>
          </View>
        )}

        <Text className={styles.sectionTitle}>数据对比</Text>

        {task.points.map((point, index) => (
          <View key={point.id} className={styles.compareCard}>
            <View className={styles.compareHeader}>
              <View className={styles.compareIndex}>
                <Text className={styles.compareIndexText}>{index + 1}</Text>
              </View>
              <View className={styles.compareInfo}>
                <Text className={styles.compareItemName}>{point.checkItemName}</Text>
                <Text className={styles.compareLocation}>{point.location}</Text>
              </View>
              <View className={styles.compareStatus}>
                <Text className={point.isDeviation ? styles.statusFail : styles.statusPass}>
                  {point.isDeviation ? '偏差' : '合格'}
                </Text>
              </View>
            </View>

            <View className={styles.dataCompareRow}>
              <View className={styles.dataCompareItem}>
                <Text className={styles.dataCompareLabel}>标准值</Text>
                <Text className={classnames(styles.dataCompareValue, styles.valueStandard)}>
                  ≤{point.standardValue}mm
                </Text>
              </View>
              <View className={styles.dataCompareItem}>
                <Text className={styles.dataCompareLabel}>实测值</Text>
                <Text className={classnames(
                  styles.dataCompareValue,
                  point.isDeviation ? styles.valueOriginal : styles.valueRetest
                )}>
                  {point.measuredValue}mm
                </Text>
              </View>
              {point.isDeviation && point.retestValue && (
                <View className={styles.dataCompareItem}>
                  <Text className={styles.dataCompareLabel}>复测值</Text>
                  <Text className={classnames(styles.dataCompareValue, styles.valueRetest)}>
                    {point.retestValue}mm
                  </Text>
                </View>
              )}
            </View>

            {(point.photos.length > 0 || (point.isDeviation && point.retestPhotos.length > 0)) && (
              <View className={classnames(
                styles.photoCompare,
                point.isDeviation ? styles.photoCompareDouble : styles.photoCompareSingle
              )}>
                {renderPhotoGrid(point.photos || [], '现场照片（原始）')}
                {point.isDeviation &&
                  renderPhotoGrid(point.retestPhotos || [], '整改后（复测）')}
              </View>
            )}

            <View className={styles.inspectorInfo}>
              <Text className={styles.inspectorLabel}>陪检人员：</Text>
              <Text className={styles.inspectorValue}>{point.inspector || '未记录'}</Text>
            </View>

            {point.isDeviation && point.rectificationOpinion && (
              <View className={styles.rectificationBox}>
                <Text className={styles.rectificationTitle}>整改意见</Text>
                <Text className={styles.rectificationText}>{point.rectificationOpinion}</Text>
                {point.rectificationDeadline && (
                  <Text className={styles.rectificationDeadline}>
                    整改期限：{point.rectificationDeadline}
                  </Text>
                )}
                {point.retestInspector && (
                  <Text className={styles.rectificationDeadline} style={{ color: '#64748B' }}>
                    复测人：{point.retestInspector}
                  </Text>
                )}
              </View>
            )}

            {point.isDeviation && point.retestInspector && (
              <View className={styles.inspectorInfo}>
                <Text className={styles.inspectorLabel}>复测人员：</Text>
                <Text className={styles.inspectorValue}>{point.retestInspector}</Text>
              </View>
            )}
          </View>
        ))}

        <Text className={styles.sectionTitle}>签认操作</Text>

        {!isSigned ? (
          <View className={styles.signSection}>
            <Text className={styles.signTitle}>签认意见</Text>
            <Input
              className={styles.signCommentInput}
              placeholder="输入签认意见（选填）"
              value={comment}
              onInput={e => setComment(e.detail.value)}
            />
            <View className={styles.signButtons}>
              <Button
                className={classnames(styles.signBtn, styles.signApprove)}
                onClick={() => handleSign('approved')}
              >
                ✅ 通过
              </Button>
              <Button
                className={classnames(styles.signBtn, styles.signReject)}
                onClick={() => handleSign('rejected')}
              >
                ❌ 退回（重新整改）
              </Button>
              <Button
                className={classnames(styles.signBtn, styles.signObserve)}
                onClick={() => handleSign('observing')}
              >
                👁️ 继续观察
              </Button>
            </View>
          </View>
        ) : (
          <View className={styles.signSection}>
            <View className={styles.signedResult}>
              <Text className={styles.signedIcon}>
                {task.signResult === 'approved' ? '✅' : task.signResult === 'rejected' ? '❌' : '👁️'}
              </Text>
              <Text className={classnames(
                styles.signedText,
                task.signResult === 'approved' && styles.signedTextApproved,
                task.signResult === 'rejected' && styles.signedTextRejected,
                task.signResult === 'observing' && styles.signedTextObserving,
              )}>
                {task.signResult === 'approved' ? '签认通过' : task.signResult === 'rejected' ? '签认退回' : '继续观察'}
              </Text>
              <Text className={styles.signedDate}>签认日期：{task.signDate}</Text>
              {task.signComment && (
                <View className={styles.commentBox}>
                  <Text className={styles.commentBoxLabel}>签认意见</Text>
                  <Text className={styles.commentBoxText}>{task.signComment}</Text>
                </View>
              )}
            </View>

            <View className={styles.signHint}>
              {task.signResult === 'approved' && (
                <Text className={styles.signHintText}>✅ 该条抽检闭环已完成，数据已归档留存。</Text>
              )}
              {task.signResult === 'rejected' && (
                <Text className={styles.signHintText}>⚠️ 该条记录已被退回，可点击下方按钮重新发起整改流程。</Text>
              )}
              {task.signResult === 'observing' && (
                <Text className={styles.signHintText}>👁️ 该条记录处于观察期，可随时进行再次复核或归档。</Text>
              )}
            </View>

            <View className={styles.trackButtons}>
              {task.signResult === 'rejected' && (
                <Button
                  className={classnames(styles.trackBtn, styles.trackBtnPrimary)}
                  onClick={handleReRectify}
                >
                  🔄 重新发起整改
                </Button>
              )}
              {task.signResult === 'observing' && (
                <Button
                  className={classnames(styles.trackBtn, styles.trackBtnPrimary)}
                  onClick={() => Taro.navigateTo({ url: `/pages/verify-detail/index?taskId=${task.id}` })}
                >
                  📋 再次复核
                </Button>
              )}
              <Button
                className={classnames(styles.trackBtn, styles.trackBtnSecondary)}
                onClick={handlePushToVerify}
              >
                返回现场复核列表
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default SignoffDetailPage;

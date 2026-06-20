import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const buildReportText = (task: any, full: boolean) => {
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
      lines.push(`  复测值：${p.retestValue}mm（复测：${p.retestDate || '已提交'}）`);
    }
    if (full) {
      if (p.isDeviation && p.rectificationOpinion) {
        lines.push(`  整改意见：${p.rectificationOpinion}`);
        if (p.rectificationDeadline) lines.push(`  整改期限：${p.rectificationDeadline}`);
      }
      if (p.photos && p.photos.length > 0) lines.push(`  原始照片：${p.photos.length}张`);
      if (p.isDeviation && p.retestPhotos && p.retestPhotos.length > 0) lines.push(`  复测照片：${p.retestPhotos.length}张`);
    }
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

const SignoffDetailPage: React.FC = () => {
  const router = useRouter();
  const taskId = router.params.taskId || '';
  const { tasks, signOff, revertForReRectify } = useInspectionStore();
  const task = tasks.find(t => t.id === taskId);

  const [comment, setComment] = useState('');

  const reportSummary = useMemo(() => {
    if (!task) return null;
    const total = task.points.length;
    const passed = task.points.filter(p => !p.isDeviation).length;
    const deviated = task.points.filter(p => p.isDeviation).length;
    const retested = task.points.filter(p => p.isDeviation && p.retestValue).length;
    const originalPhotos = task.points.reduce((sum, p) => sum + (p.photos?.length || 0), 0);
    const retestPhotos = task.points.reduce((sum, p) => sum + ((p.retestPhotos?.length || 0)), 0);
    return { total, passed, deviated, retested, originalPhotos, retestPhotos };
  }, [task]);

  const handlePreviewImage = (urls: string[], current: string) => {
    if (!urls || urls.length === 0) return;
    Taro.previewImage({ urls, current });
  };

  const handleCopyReport = () => {
    if (!task) return;
    const txt = buildReportText(task, true);
    Taro.setClipboardData({
      data: txt,
      success: () => Taro.showToast({ title: '完整报告已复制', icon: 'success' }),
    });
  };

  const handleExportReport = () => {
    if (!task) return;
    const txt = buildReportText(task, false);
    Taro.setClipboardData({
      data: txt,
      success: () => Taro.showToast({ title: '留档文本已复制', icon: 'success' }),
    });
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

  const renderPhotoGrid = (photos: string[], gridTitle: string, gridCls: string) => {
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
              {task.points.map((point, index) => (
                <View key={point.id} className={styles.reportItem}>
                  <View className={styles.reportItemHead}>
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
                      {point.isDeviation ? '偏差' : '合格'}
                    </Text>
                  </View>

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
                    </View>
                  )}
                </View>
              ))}
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
                📝 复制留档文本
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
                {renderPhotoGrid(point.photos || [], '现场照片（原始）', 'original')}
                {point.isDeviation &&
                  renderPhotoGrid(point.retestPhotos || [], '整改后（复测）', 'retest')}
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

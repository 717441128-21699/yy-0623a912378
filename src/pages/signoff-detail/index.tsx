import React, { useState } from 'react';
import { View, Text, Input, Button, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const SignoffDetailPage: React.FC = () => {
  const router = useRouter();
  const taskId = router.params.taskId || '';
  const { tasks, signOff, revertForReRectify } = useInspectionStore();
  const task = tasks.find(t => t.id === taskId);

  const [comment, setComment] = useState('');

  const handlePreviewImage = (urls: string[], current: string) => {
    if (!urls || urls.length === 0) return;
    Taro.previewImage({ urls, current });
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

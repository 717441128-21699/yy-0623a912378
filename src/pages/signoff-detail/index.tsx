import React, { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const SignoffDetailPage: React.FC = () => {
  const router = useRouter();
  const taskId = router.params.taskId || '';
  const { tasks, signOff } = useInspectionStore();
  const task = tasks.find(t => t.id === taskId);

  const [comment, setComment] = useState('');

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
              <View className={styles.photoCompare}>
                <View className={styles.photoCompareItem}>
                  <Text className={styles.photoCompareLabel}>原始照片</Text>
                  <View className={styles.photoCompareBox}>
                    <Text className={styles.photoCompareText}>
                      {point.photos.length > 0 ? `📷 ${point.photos.length}张` : '无照片'}
                    </Text>
                  </View>
                </View>
                {point.isDeviation && (
                  <View className={styles.photoCompareItem}>
                    <Text className={styles.photoCompareLabel}>复测照片</Text>
                    <View className={styles.photoCompareBox}>
                      <Text className={styles.photoCompareText}>
                        {point.retestPhotos.length > 0 ? `📷 ${point.retestPhotos.length}张` : '无照片'}
                      </Text>
                    </View>
                  </View>
                )}
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

        {isSigned ? (
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
                {task.signResult === 'approved' ? '已通过' : task.signResult === 'rejected' ? '已退回' : '继续观察'}
              </Text>
              <Text className={styles.signedDate}>签认日期：{task.signDate}</Text>
              {task.signComment && (
                <Text className={styles.signedDate} style={{ marginTop: '16rpx' }}>
                  签认意见：{task.signComment}
                </Text>
              )}
            </View>
          </View>
        ) : (
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
                ❌ 退回
              </Button>
              <Button
                className={classnames(styles.signBtn, styles.signObserve)}
                onClick={() => handleSign('observing')}
              >
                👁️ 继续观察
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default SignoffDetailPage;

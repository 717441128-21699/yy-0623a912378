import React, { useState, useCallback } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const VerifyDetailPage: React.FC = () => {
  const router = useRouter();
  const taskId = router.params.taskId || '';
  const { tasks, updatePoint, submitTask, submitRetest } = useInspectionStore();
  const task = tasks.find(t => t.id === taskId);

  const [measuredValues, setMeasuredValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    task?.points.forEach(p => { vals[p.id] = p.measuredValue; });
    return vals;
  });

  const [inspectors, setInspectors] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    task?.points.forEach(p => { vals[p.id] = p.inspector; });
    return vals;
  });

  const [opinions, setOpinions] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    task?.points.forEach(p => { vals[p.id] = p.rectificationOpinion; });
    return vals;
  });

  const [deadlines, setDeadlines] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    task?.points.forEach(p => { vals[p.id] = p.rectificationDeadline; });
    return vals;
  });

  const [retestValues, setRetestValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    task?.points.forEach(p => { vals[p.id] = p.retestValue; });
    return vals;
  });

  const [retestInspectors, setRetestInspectors] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    task?.points.forEach(p => { vals[p.id] = p.retestInspector; });
    return vals;
  });

  const checkDeviation = useCallback((pointId: string, value: string) => {
    if (!task || !value) return false;
    const point = task.points.find(p => p.id === pointId);
    if (!point) return false;
    const numVal = parseFloat(value);
    const standardVal = parseFloat(point.standardValue);
    if (isNaN(numVal) || isNaN(standardVal)) return false;
    return numVal > standardVal;
  }, [task]);

  const handleMeasuredChange = (pointId: string, value: string) => {
    setMeasuredValues(prev => ({ ...prev, [pointId]: value }));
    const isDeviation = checkDeviation(pointId, value);
    updatePoint(taskId, pointId, {
      measuredValue: value,
      isDeviation,
    });
  };

  const handleInspectorChange = (pointId: string, value: string) => {
    setInspectors(prev => ({ ...prev, [pointId]: value }));
    updatePoint(taskId, pointId, { inspector: value });
  };

  const handleOpinionChange = (pointId: string, value: string) => {
    setOpinions(prev => ({ ...prev, [pointId]: value }));
  };

  const handleDeadlineChange = (pointId: string, value: string) => {
    setDeadlines(prev => ({ ...prev, [pointId]: value }));
  };

  const handleSaveRectification = (pointId: string) => {
    const opinion = opinions[pointId] || '';
    const deadline = deadlines[pointId] || '';
    if (!opinion) {
      Taro.showToast({ title: '请输入整改意见', icon: 'none' });
      return;
    }
    updatePoint(taskId, pointId, {
      rectificationOpinion: opinion,
      rectificationDeadline: deadline,
    });
    Taro.showToast({ title: '整改意见已保存', icon: 'success' });
  };

  const handleRetestValueChange = (pointId: string, value: string) => {
    setRetestValues(prev => ({ ...prev, [pointId]: value }));
  };

  const handleRetestInspectorChange = (pointId: string, value: string) => {
    setRetestInspectors(prev => ({ ...prev, [pointId]: value }));
  };

  const handleSubmitRetest = (pointId: string) => {
    const retestVal = retestValues[pointId] || '';
    const retestInspector = retestInspectors[pointId] || '';
    if (!retestVal) {
      Taro.showToast({ title: '请输入复测值', icon: 'none' });
      return;
    }
    submitRetest(taskId, pointId, retestVal, [], retestInspector);
    Taro.showToast({ title: '复测数据已提交', icon: 'success' });
  };

  const handleSubmit = () => {
    if (!task) return;
    const allMeasured = task.points.every(p => measuredValues[p.id]);
    if (!allMeasured) {
      Taro.showToast({ title: '请完成所有点位测量', icon: 'none' });
      return;
    }
    const hasDeviationWithoutOpinion = task.points.some(
      p => p.isDeviation && !p.rectificationOpinion
    );
    if (hasDeviationWithoutOpinion) {
      Taro.showToast({ title: '偏差点位需填写整改意见', icon: 'none' });
      return;
    }
    submitTask(taskId);
    Taro.showToast({ title: '提交成功', icon: 'success' });
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/verify/index' });
    }, 1500);
  };

  if (!task) {
    return (
      <View className={styles.container}>
        <View className={styles.taskInfo}>
          <Text className={styles.taskSection}>任务不存在</Text>
        </View>
      </View>
    );
  }

  const isRectifying = task.status === 'rectifying';
  const allMeasured = task.points.every(p => measuredValues[p.id]);

  return (
    <View className={styles.container}>
      <View className={styles.taskInfo}>
        <Text className={styles.taskSection}>{task.sectionName}</Text>
        <Text className={styles.taskDate}>抽检日期：{task.date}</Text>
      </View>

      <View className={styles.body}>
        {task.points.map((point, index) => {
          const isDeviation = checkDeviation(point.id, measuredValues[point.id] || '');
          const hasMeasured = !!measuredValues[point.id];
          const isRetestNeeded = isRectifying && point.isDeviation && !point.retestValue;

          return (
            <View key={point.id} className={styles.pointCard}>
              <View className={styles.pointHeader}>
                <View className={styles.pointIndex}>
                  <Text className={styles.pointIndexText}>{index + 1}</Text>
                </View>
                <View className={styles.pointInfo}>
                  <Text className={styles.pointItemName}>{point.checkItemName}</Text>
                  <Text className={styles.pointLocation}>{point.location}</Text>
                </View>
                {hasMeasured && (
                  <View className={styles.pointStatus}>
                    <View className={classnames(
                      isDeviation ? styles.failDot : styles.passDot
                    )} />
                  </View>
                )}
              </View>

              <View className={styles.inputGroup}>
                <Text className={styles.inputLabel}>实测值</Text>
                <View className={styles.inputRow}>
                  <Input
                    className={styles.measuredInput}
                    type="digit"
                    placeholder="输入实测值"
                    value={measuredValues[point.id] || ''}
                    onInput={e => handleMeasuredChange(point.id, e.detail.value)}
                  />
                  <Text className={styles.inputUnit}>mm</Text>
                </View>
                <Text className={styles.standardHint}>
                  标准值：≤{point.standardValue}mm
                  {hasMeasured && isDeviation && ' ⚠️ 超出允许偏差'}
                </Text>
              </View>

              <View className={styles.photoSection}>
                <Text className={styles.photoLabel}>现场照片</Text>
                <View className={styles.photoRow}>
                  {(point.photos.length > 0 ? point.photos : []).map((_, idx) => (
                    <View key={idx} className={styles.photoItem}>
                      <Text style={{ fontSize: '24rpx', color: '#94A3B8' }}>📷</Text>
                    </View>
                  ))}
                  <View
                    className={styles.photoAddBtn}
                    onClick={() => {
                      const currentPhotos = [...(point.photos || [])];
                      currentPhotos.push(`photo_${Date.now()}`);
                      updatePoint(taskId, point.id, { photos: currentPhotos });
                      Taro.showToast({ title: '已添加照片', icon: 'success' });
                    }}
                  >
                    <Text className={styles.photoAddText}>+</Text>
                  </View>
                </View>
              </View>

              <View className={styles.inputGroup}>
                <Text className={styles.inputLabel}>施工单位陪检人员</Text>
                <Input
                  className={styles.inspectorInput}
                  placeholder="输入陪检人员姓名"
                  value={inspectors[point.id] || ''}
                  onInput={e => handleInspectorChange(point.id, e.detail.value)}
                />
              </View>

              {hasMeasured && isDeviation && !isRectifying && (
                <View className={styles.deviationBox}>
                  <Text className={styles.deviationTitle}>⚠️ 发现偏差 - 生成整改意见</Text>
                  <Input
                    className={styles.deviationInput}
                    placeholder="输入整改意见"
                    value={opinions[point.id] || ''}
                    onInput={e => handleOpinionChange(point.id, e.detail.value)}
                  />
                  <View className={styles.deadlineRow}>
                    <Text className={styles.deadlineLabel}>整改期限</Text>
                    <Input
                      className={styles.deadlineInput}
                      type="text"
                      placeholder="如：2025-06-25"
                      value={deadlines[point.id] || ''}
                      onInput={e => handleDeadlineChange(point.id, e.detail.value)}
                    />
                  </View>
                  <Button
                    className={styles.submitButton}
                    style={{ height: '64rpx', fontSize: '24rpx', marginTop: '16rpx' }}
                    onClick={() => handleSaveRectification(point.id)}
                  >
                    保存整改意见
                  </Button>
                </View>
              )}

              {point.rectificationOpinion && (
                <View className={styles.deviationBox}>
                  <Text className={styles.deviationTitle}>整改意见</Text>
                  <Text style={{ fontSize: '24rpx', color: '#475569' }}>{point.rectificationOpinion}</Text>
                  {point.rectificationDeadline && (
                    <Text style={{ fontSize: '22rpx', color: '#F59E0B', marginTop: '8rpx', display: 'block' }}>
                      整改期限：{point.rectificationDeadline}
                    </Text>
                  )}
                </View>
              )}

              {isRetestNeeded && (
                <View className={styles.retestSection}>
                  <Text className={styles.retestTitle}>🔄 提交复测结果</Text>
                  <View className={styles.inputGroup}>
                    <Text className={styles.inputLabel}>复测值</Text>
                    <View className={styles.inputRow}>
                      <Input
                        className={styles.measuredInput}
                        type="digit"
                        placeholder="输入复测值"
                        value={retestValues[point.id] || ''}
                        onInput={e => handleRetestValueChange(point.id, e.detail.value)}
                      />
                      <Text className={styles.inputUnit}>mm</Text>
                    </View>
                  </View>
                  <View className={styles.inputGroup}>
                    <Text className={styles.inputLabel}>复测陪检人员</Text>
                    <Input
                      className={styles.inspectorInput}
                      placeholder="输入复测陪检人员姓名"
                      value={retestInspectors[point.id] || ''}
                      onInput={e => handleRetestInspectorChange(point.id, e.detail.value)}
                    />
                  </View>
                  <Button
                    className={styles.submitButton}
                    style={{ height: '72rpx', fontSize: '26rpx' }}
                    onClick={() => handleSubmitRetest(point.id)}
                  >
                    提交复测
                  </Button>
                </View>
              )}

              {point.retestValue && (
                <View className={styles.retestSection}>
                  <Text className={styles.retestTitle}>✅ 复测结果</Text>
                  <View style={{ display: 'flex', gap: '24rpx' }}>
                    <View style={{ flex: 1, textAlign: 'center' }}>
                      <Text style={{ fontSize: '22rpx', color: '#94A3B8', display: 'block' }}>实测值</Text>
                      <Text style={{ fontSize: '32rpx', fontWeight: 600, color: '#EF4444' }}>{point.measuredValue}mm</Text>
                    </View>
                    <View style={{ flex: 1, textAlign: 'center' }}>
                      <Text style={{ fontSize: '22rpx', color: '#94A3B8', display: 'block' }}>复测值</Text>
                      <Text style={{ fontSize: '32rpx', fontWeight: 600, color: '#10B981' }}>{point.retestValue}mm</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {!isRectifying && (
        <View className={styles.bottomBar}>
          <Button
            className={classnames(
              styles.submitButton,
              !allMeasured && styles.submitButtonDisabled
            )}
            onClick={handleSubmit}
            disabled={!allMeasured}
          >
            提交复核
          </Button>
        </View>
      )}
    </View>
  );
};

export default VerifyDetailPage;

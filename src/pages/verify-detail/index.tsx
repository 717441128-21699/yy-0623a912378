import React, { useState, useCallback } from 'react';
import { View, Text, Input, Button, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildDefaultRectification = (
  checkItemName: string,
  measuredValue: string,
  standardValue: string,
  location: string,
) => {
  const numMeasured = parseFloat(measuredValue);
  const numStandard = parseFloat(standardValue);
  const diff = isNaN(numMeasured) || isNaN(numStandard) ? 0 : Math.max(0, numMeasured - numStandard);
  const pct = numStandard > 0 ? (diff / numStandard) * 100 : 0;

  let daysToAdd = 3;
  let severity = '一般偏差';
  let measureText = '局部返工处理';

  if (pct >= 100 || diff >= 20) {
    daysToAdd = 7;
    severity = '严重偏差';
    measureText = '必须拆除重做，按专项整改方案施工';
  } else if (pct >= 50 || diff >= 10) {
    daysToAdd = 5;
    severity = '较大偏差';
    measureText = '局部返工修补，处理完成后重新复测';
  } else if (pct >= 20 || diff >= 5) {
    daysToAdd = 4;
    severity = '明显偏差';
    measureText = '修整打磨或局部修补，重新验收';
  }

  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + daysToAdd);

  const opinion = `【${severity}】${checkItemName}（${location}）实测${numMeasured}mm，允许偏差≤${numStandard}mm，超差${diff.toFixed(1)}mm（超${pct.toFixed(0)}%）。整改要求：${measureText}，整改完成后报监理复测。`;

  return {
    opinion,
    deadline: formatDate(deadlineDate),
    severity,
  };
};

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

  const [retestPhotos, setRetestPhotos] = useState<Record<string, string[]>>(() => {
    const vals: Record<string, string[]> = {};
    task?.points.forEach(p => { vals[p.id] = [...(p.retestPhotos || [])]; });
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
    const point = task?.points.find(p => p.id === pointId);

    const updates: Record<string, any> = {
      measuredValue: value,
      isDeviation,
    };

    if (isDeviation && point && value) {
      const existingOpinion = opinions[pointId];
      const existingDeadline = deadlines[pointId];
      if (!existingOpinion || !existingDeadline) {
        const { opinion, deadline } = buildDefaultRectification(
          point.checkItemName,
          value,
          point.standardValue,
          point.location,
        );
        if (!existingOpinion) {
          setOpinions(prev => ({ ...prev, [pointId]: opinion }));
        }
        if (!existingDeadline) {
          setDeadlines(prev => ({ ...prev, [pointId]: deadline }));
        }
      }
    }

    updatePoint(taskId, pointId, updates);
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

  const handleChooseImage = (pointId: string, isRetest: boolean) => {
    Taro.chooseImage({
      count: 9,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
    }).then(res => {
      const paths = res.tempFilePaths;
      console.info('[Verify] Chose images:', paths);
      if (isRetest) {
        setRetestPhotos(prev => {
          const next = { ...prev };
          const existing = next[pointId] || [];
          next[pointId] = [...existing, ...paths];
          return next;
        });
      } else {
        const targetPoint = task?.points.find(p => p.id === pointId);
        if (targetPoint) {
          updatePoint(taskId, pointId, {
            photos: [...(targetPoint.photos || []), ...paths],
          });
        }
      }
      Taro.showToast({ title: '已添加照片', icon: 'success' });
    }).catch(err => {
      console.error('[Verify] chooseImage error:', err);
    });
  };

  const handleRemoveImage = (pointId: string, index: number, isRetest: boolean) => {
    if (isRetest) {
      setRetestPhotos(prev => {
        const next = { ...prev };
        const existing = next[pointId] || [];
        existing.splice(index, 1);
        next[pointId] = existing;
        return next;
      });
    } else {
      const targetPoint = task?.points.find(p => p.id === pointId);
      if (targetPoint) {
        const newPhotos = [...targetPoint.photos];
        newPhotos.splice(index, 1);
        updatePoint(taskId, pointId, { photos: newPhotos });
      }
    }
  };

  const handlePreviewImage = (urls: string[], current: string) => {
    if (!urls || urls.length === 0) return;
    Taro.previewImage({ urls, current });
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
    const currentRetestPhotos = retestPhotos[pointId] || [];
    if (!retestVal) {
      Taro.showToast({ title: '请输入复测值', icon: 'none' });
      return;
    }
    submitRetest(taskId, pointId, retestVal, currentRetestPhotos, retestInspector);
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
          const currentRetestPhotos = retestPhotos[point.id] || [];

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
                  {(point.photos || []).map((photo, idx) => (
                    <View key={idx} className={styles.photoItem}>
                      <Image
                        className={styles.photoImg}
                        src={photo}
                        mode="aspectFill"
                        onClick={() => handlePreviewImage(point.photos || [], photo)}
                      />
                      <View
                        className={styles.photoRemoveBtn}
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(point.id, idx, false); }}
                      >
                        <Text className={styles.photoRemoveText}>×</Text>
                      </View>
                    </View>
                  ))}
                  <View
                    className={styles.photoAddBtn}
                    onClick={() => handleChooseImage(point.id, false)}
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
                  <Text className={styles.deviationTitle}>⚠️ 发现偏差 - 自动生成整改意见（可修改）</Text>
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
                    className={styles.saveRectifyBtn}
                    onClick={() => handleSaveRectification(point.id)}
                  >
                    保存整改意见
                  </Button>
                </View>
              )}

              {point.rectificationOpinion && (
                <View className={styles.deviationBox}>
                  <Text className={styles.deviationTitle}>整改意见</Text>
                  <Text className={styles.opinionText}>{point.rectificationOpinion}</Text>
                  {point.rectificationDeadline && (
                    <Text className={styles.deadlineText}>
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

                  <View className={styles.photoSection}>
                    <Text className={styles.photoLabel}>复测照片（整改后）</Text>
                    <View className={styles.photoRow}>
                      {currentRetestPhotos.map((photo, idx) => (
                        <View key={idx} className={styles.photoItem}>
                          <Image
                            className={styles.photoImg}
                            src={photo}
                            mode="aspectFill"
                            onClick={() => handlePreviewImage(currentRetestPhotos, photo)}
                          />
                          <View
                            className={styles.photoRemoveBtn}
                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(point.id, idx, true); }}
                          >
                            <Text className={styles.photoRemoveText}>×</Text>
                          </View>
                        </View>
                      ))}
                      <View
                        className={styles.photoAddBtn}
                        onClick={() => handleChooseImage(point.id, true)}
                      >
                        <Text className={styles.photoAddText}>+</Text>
                      </View>
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
                    className={styles.submitRetestBtn}
                    onClick={() => handleSubmitRetest(point.id)}
                  >
                    提交复测
                  </Button>
                </View>
              )}

              {point.retestValue && (
                <View className={styles.retestSection}>
                  <Text className={styles.retestTitle}>✅ 复测结果</Text>
                  <View className={styles.measureCompareRow}>
                    <View className={styles.measureCompareCol}>
                      <Text className={styles.measureCompareLabel}>实测值</Text>
                      <Text className={styles.measureCompareOriginal}>{point.measuredValue}mm</Text>
                    </View>
                    <View className={styles.measureCompareCol}>
                      <Text className={styles.measureCompareLabel}>复测值</Text>
                      <Text className={styles.measureCompareRetest}>{point.retestValue}mm</Text>
                    </View>
                  </View>
                  {point.retestPhotos && point.retestPhotos.length > 0 && (
                    <View className={classnames(styles.photoSection, styles.retestPhotosSection)}>
                      <Text className={styles.photoLabel}>复测照片</Text>
                      <View className={styles.photoRow}>
                        {point.retestPhotos.map((photo, idx) => (
                          <View key={idx} className={styles.photoItem}>
                            <Image
                              className={styles.photoImg}
                              src={photo}
                              mode="aspectFill"
                              onClick={() => handlePreviewImage(point.retestPhotos || [], photo)}
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
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

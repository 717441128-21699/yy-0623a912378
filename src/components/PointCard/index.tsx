import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { InspectionPoint } from '@/types/inspection';
import styles from './index.module.scss';

interface PointCardProps {
  point: InspectionPoint;
  index: number;
  isRetest?: boolean;
}

const PointCard: React.FC<PointCardProps> = ({ point, index, isRetest }) => {
  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <View className={styles.indexBadge}>
          <Text className={styles.indexText}>{index + 1}</Text>
        </View>
        <View className={styles.headerInfo}>
          <Text className={styles.itemName}>{point.checkItemName}</Text>
          <Text className={styles.location}>{point.location}</Text>
        </View>
        {point.measuredValue && (
          <View className={classnames(
            styles.statusDot,
            point.isDeviation ? styles.statusFail : styles.statusPass
          )} />
        )}
      </View>

      <View className={styles.dataRow}>
        <View className={styles.dataItem}>
          <Text className={styles.dataLabel}>标准值</Text>
          <Text className={styles.dataValue}>{point.standardValue}{point.checkItemName.includes('mm') ? '' : 'mm'}</Text>
        </View>
        {point.measuredValue && (
          <View className={styles.dataItem}>
            <Text className={styles.dataLabel}>实测值</Text>
            <Text className={classnames(
              styles.dataValue,
              point.isDeviation && styles.dataValueFail
            )}>{point.measuredValue}mm</Text>
          </View>
        )}
        {isRetest && point.retestValue && (
          <View className={styles.dataItem}>
            <Text className={styles.dataLabel}>复测值</Text>
            <Text className={styles.dataValueRetest}>{point.retestValue}mm</Text>
          </View>
        )}
      </View>

      {point.inspector && (
        <View className={styles.inspectorRow}>
          <Text className={styles.inspectorLabel}>陪检人员：</Text>
          <Text className={styles.inspectorValue}>{point.inspector}</Text>
        </View>
      )}

      {point.isDeviation && point.rectificationOpinion && (
        <View className={styles.rectificationBox}>
          <Text className={styles.rectificationTitle}>整改意见</Text>
          <Text className={styles.rectificationText}>{point.rectificationOpinion}</Text>
          {point.rectificationDeadline && (
            <Text className={styles.rectificationDeadline}>整改期限：{point.rectificationDeadline}</Text>
          )}
        </View>
      )}

      {point.photos.length > 0 && (
        <View className={styles.photoRow}>
          {point.photos.map((photo, idx) => (
            <View key={idx} className={styles.photoItem}>
              <Text className={styles.photoPlaceholder}>📷 照片{idx + 1}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default PointCard;

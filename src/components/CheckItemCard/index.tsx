import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { CheckItem } from '@/types/inspection';
import styles from './index.module.scss';

interface CheckItemCardProps {
  item: CheckItem;
  checked: boolean;
  onToggle: (id: string) => void;
}

const CheckItemCard: React.FC<CheckItemCardProps> = ({ item, checked, onToggle }) => {
  return (
    <View
      className={classnames(styles.card, checked && styles.cardChecked)}
      onClick={() => onToggle(item.id)}
    >
      <View className={classnames(styles.checkbox, checked && styles.checkboxChecked)}>
        {checked && <Text className={styles.checkmark}>✓</Text>}
      </View>
      <View className={styles.info}>
        <Text className={styles.name}>{item.name}</Text>
        <Text className={styles.standard}>标准：{item.standard}</Text>
      </View>
    </View>
  );
};

export default CheckItemCard;

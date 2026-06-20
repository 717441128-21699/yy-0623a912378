import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { TaskStatus } from '@/types/inspection';
import styles from './index.module.scss';

interface StatusTagProps {
  status: TaskStatus;
}

const statusMap: Record<TaskStatus, { label: string; className: string }> = {
  planned: { label: '已计划', className: 'planned' },
  inspecting: { label: '检查中', className: 'inspecting' },
  rectifying: { label: '整改中', className: 'rectifying' },
  pending_sign: { label: '待签认', className: 'pendingSign' },
  signed: { label: '已签认', className: 'signed' },
};

const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const config = statusMap[status];
  return (
    <View className={classnames(styles.tag, styles[config.className])}>
      <Text className={styles.tagText}>{config.label}</Text>
    </View>
  );
};

export default StatusTag;

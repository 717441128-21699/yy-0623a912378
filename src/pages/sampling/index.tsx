import React, { useState, useMemo } from 'react';
import { View, Text, Picker, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import CheckItemCard from '@/components/CheckItemCard';
import { useInspectionStore } from '@/store/inspection';
import styles from './index.module.scss';

const SamplingPage: React.FC = () => {
  const { sections, checkCategories, createTask } = useInspectionStore();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const sectionNames = useMemo(
    () => sections.map(s => `${s.name} ${s.project}`),
    [sections]
  );

  const currentSection = sections[sectionIndex];

  const handleToggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCategoryToggle = (categoryName: string) => {
    const category = checkCategories.find(c => c.name === categoryName);
    if (!category) return;
    const itemIds = category.items.map(i => i.id);
    const allSelected = itemIds.every(id => selectedItems.includes(id));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  const previewData = useMemo(() => {
    const allItems = checkCategories.flatMap(cat => cat.items);
    return selectedItems.map(id => {
      const item = allItems.find(i => i.id === id);
      if (!item) return null;
      const count = 2 + (id.charCodeAt(id.length - 1) % 3);
      return { name: item.name, count, standard: item.standard };
    }).filter(Boolean);
  }, [selectedItems, checkCategories]);

  const handleStart = () => {
    if (!currentSection || selectedItems.length === 0) return;
    const taskId = createTask(
      currentSection.id,
      `${currentSection.name} ${currentSection.project}`,
      selectedItems
    );
    console.info('[Sampling] Created task:', taskId);
    Taro.switchTab({ url: '/pages/verify/index' });
  };

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.greeting}>监理巡查抽检</Text>
        <Text className={styles.dateText}>{today}</Text>
      </View>

      <View className={styles.body}>
        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>
            📍 选择巡查标段
          </Text>
          <Picker
            mode="selector"
            range={sectionNames}
            value={sectionIndex}
            onChange={e => setSectionIndex(Number(e.detail.value))}
          >
            <View className={styles.pickerTrigger}>
              <Text className={styles.pickerValue}>
                {sectionNames[sectionIndex]}
              </Text>
              <Text className={styles.pickerArrow}>▼</Text>
            </View>
          </Picker>
        </View>

        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>
            ✅ 勾选检查部位
          </Text>
          {checkCategories.map(category => (
            <View key={category.name} className={styles.categorySection}>
              <Text
                className={styles.categoryTitle}
                onClick={() => handleCategoryToggle(category.name)}
              >
                {category.name}
              </Text>
              {category.items.map(item => (
                <CheckItemCard
                  key={item.id}
                  item={item}
                  checked={selectedItems.includes(item.id)}
                  onToggle={handleToggleItem}
                />
              ))}
            </View>
          ))}
        </View>

        {selectedItems.length > 0 && (
          <View className={styles.pointsPreview}>
            <Text className={styles.previewTitle}>📋 自动生成抽检点预览</Text>
            <View className={styles.previewList}>
              {previewData.map((item, idx) => (
                <View key={idx} className={styles.previewItem}>
                  <Text className={styles.previewItemName}>{item!.name}</Text>
                  <Text className={styles.previewItemCount}>
                    生成 {item!.count} 个抽检点（标准{item!.standard}）
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedItems.length === 0 && (
          <View className={styles.pointsPreview}>
            <Text className={styles.emptyHint}>请先选择检查部位，系统将自动生成随机抽检点</Text>
          </View>
        )}
      </View>

      <View className={styles.bottomBar}>
        <Button
          className={classnames(
            styles.startButton,
            selectedItems.length === 0 && styles.startButtonDisabled
          )}
          onClick={handleStart}
          disabled={selectedItems.length === 0}
        >
          开始抽检（{selectedItems.length}项）
        </Button>
      </View>
    </View>
  );
};

export default SamplingPage;

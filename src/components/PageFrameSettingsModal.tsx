import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { PageFrameDefinition } from '../domain/frameRegistry';
import { DEFAULT_HOLDING_WALL_CONFIG } from '../domain/uiModels';
import type { MainPageKey } from '../domain/pageRegistry';
import {
  normalizeEditorConfig,
  type FrameAppearance,
  type FrameBehavior,
  type FrameEditorConfig,
  type FrameLayout,
  type PageDisplayConfig,
  usePageEditor,
} from '../editor/pageEditor';
import { colors, radius, spacing } from '../theme/tokens';
import { useMonitorSettingsRuntime } from '../monitor/MonitorSettingsRuntime';
import { HoldingMarketWallEditor } from './HoldingMarketWallEditor';

const layouts: readonly { key: FrameLayout; label: string }[] = [
  { key: 'standard', label: '標準' },
  { key: 'compact', label: '緊湊' },
  { key: 'dense', label: '密集' },
];
const appearances: readonly { key: FrameAppearance; label: string }[] = [
  { key: 'theme', label: '跟隨主題' },
  { key: 'soft', label: '柔和底色' },
  { key: 'outline', label: '強調外框' },
];
const behaviors: readonly { key: FrameBehavior; label: string }[] = [
  { key: 'manual', label: '手動排序' },
  { key: 'auto', label: '自動順位' },
  { key: 'locked', label: '鎖定' },
];

export function PageFrameSettingsModal({
  visible,
  pageKey,
  title,
  frames,
  onClose,
}: {
  visible: boolean;
  pageKey: MainPageKey;
  title: string;
  frames: readonly PageFrameDefinition[];
  onClose: () => void;
}) {
  const { config, displayConfig, replacePageConfig, updateDisplayConfig, resetPage } = usePageEditor(pageKey);
  const monitor=useMonitorSettingsRuntime();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, FrameEditorConfig>>({ ...config });
  const [displayDraft,setDisplayDraft]=useState<PageDisplayConfig>({...displayConfig});

  useEffect(() => {
    if (visible) {
      setDraft({ ...config });
      setDisplayDraft({...displayConfig});
      setOpen(null);
    }
  }, [visible, config, displayConfig]);

  const orderedFrames = useMemo(
    () => [...frames].sort((a, b) => (draft[a.key]?.order ?? 0) - (draft[b.key]?.order ?? 0)),
    [frames, draft],
  );

  const patch = (key: string, next: Partial<FrameEditorConfig>) => {
    const current = draft[key];
    if (!current || current.behavior === 'locked') return;
    setDraft(value => ({ ...value, [key]: { ...current, ...next } }));
  };

  const setBehavior = (key: string, behavior: FrameBehavior) => {
    const current = draft[key];
    if (!current) return;
    setDraft(value => ({ ...value, [key]: { ...current, behavior } }));
  };

  const move = (key: string, delta: -1 | 1) => {
    const current = draft[key];
    if (!current || current.behavior !== 'manual') return;
    const ordered = [...orderedFrames];
    const index = ordered.findIndex(frame => frame.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const other = draft[ordered[target]!.key];
    if (!other || other.behavior === 'locked') return;
    setDraft(value => ({
      ...value,
      [key]: { ...current, order: other.order },
      [ordered[target]!.key]: { ...other, order: current.order },
    }));
  };

  const apply = () => {
    replacePageConfig(normalizeEditorConfig(pageKey, draft));
    updateDisplayConfig(displayDraft);
    onClose();
  };

  const cancel = () => {
    setDraft({ ...config });
    setDisplayDraft({...displayConfig});
    onClose();
  };

  const reset = () => {
    resetPage();
    onClose();
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={cancel}>
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>頁面框架設定</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>每個實際框架是 A；展開後只修改該框架直接 B 層，不跨層控制。</Text>
        </View>
        <Pressable style={styles.cancel} onPress={cancel}><Text style={styles.cancelText}>取消</Text></Pressable>
        <Pressable style={styles.save} onPress={apply}><Text style={styles.saveText}>套用</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarText}>TF Asset 暫存編輯：只有按「套用」才會寫入目前頁面設定。</Text>
          <Pressable onPress={reset}><Text style={styles.resetText}>重設本頁</Text></Pressable>
        </View>

        {orderedFrames.map((frame, index) => {
          const expanded = open === frame.key;
          const value = draft[frame.key];
          if (!value) return null;
          const locked = value.behavior === 'locked';

          return <View key={frame.key} style={styles.section}>
            <View style={styles.header}>
              <Pressable style={{ flex: 1 }} onPress={() => setOpen(expanded ? null : frame.key)}>
                <Text style={styles.sectionTitle}>{frame.title}</Text>
                <Text style={styles.description}>{frame.description}</Text>
              </Pressable>
              <View style={styles.headerActions}>
                <Switch
                  value={value.visible}
                  disabled={locked}
                  onValueChange={visibleValue => patch(frame.key, { visible: visibleValue })}
                  trackColor={{ true: colors.primary }}
                />
                <Text style={styles.toggle}>{expanded ? '−' : '+'}</Text>
              </View>
            </View>

            {expanded ? <View style={styles.body}>
              <EditorRow title="顯示內容" subtitle={value.visible ? '此框架顯示' : '此框架隱藏'}>
                <Switch
                  value={value.visible}
                  disabled={locked}
                  onValueChange={visibleValue => patch(frame.key, { visible: visibleValue })}
                  trackColor={{ true: colors.primary }}
                />
              </EditorRow>

              <EditorRow title="版面" subtitle="控制框架內距與資訊密度">
                <ChoiceGroup
                  disabled={locked}
                  items={layouts}
                  value={value.layout}
                  onChange={layout => patch(frame.key, { layout })}
                />
              </EditorRow>

              <EditorRow title="外觀" subtitle="只調整目前框架視覺">
                <ChoiceGroup
                  disabled={locked}
                  items={appearances}
                  value={value.appearance}
                  onChange={appearance => patch(frame.key, { appearance })}
                />
              </EditorRow>

              <EditorRow title="排序 / 行為" subtitle="手動可移位；自動回到頁面預設順位；鎖定禁止修改">
                <ChoiceGroup
                  items={behaviors}
                  value={value.behavior}
                  onChange={behavior => setBehavior(frame.key, behavior)}
                />
              </EditorRow>

              <View style={styles.orderRow}>
                <Pressable
                  disabled={value.behavior !== 'manual' || index === 0}
                  onPress={() => move(frame.key, -1)}
                  style={[styles.orderButton, (value.behavior !== 'manual' || index === 0) && styles.disabled]}
                ><Text style={styles.orderText}>↑ 上移</Text></Pressable>
                <Text style={styles.orderIndex}>順位 {index + 1}</Text>
                <Pressable
                  disabled={value.behavior !== 'manual' || index === orderedFrames.length - 1}
                  onPress={() => move(frame.key, 1)}
                  style={[styles.orderButton, (value.behavior !== 'manual' || index === orderedFrames.length - 1) && styles.disabled]}
                ><Text style={styles.orderText}>↓ 下移</Text></Pressable>
              </View>

              {pageKey==='home'&&frame.key==='market-news'?<View style={styles.newsEditor}>
                <EditorRow title="新聞顯示筆數" subtitle="首頁市場新聞顯示 3／5／10 筆">
                  <ChoiceGroup items={([{key:'3',label:'3 筆'},{key:'5',label:'5 筆'},{key:'10',label:'10 筆'}] as const)} value={String(displayDraft.newsVisibleCount??5) as '3'|'5'|'10'} onChange={value=>setDisplayDraft(current=>({...current,newsVisibleCount:Number(value)}))}/>
                </EditorRow>
                <EditorRow title="僅顯示持股相關" subtitle="新聞來源依目前持股代號與名稱搜尋">
                  <Switch value={displayDraft.newsHoldingsOnly??true} onValueChange={newsHoldingsOnly=>setDisplayDraft(current=>({...current,newsHoldingsOnly}))} trackColor={{true:colors.primary}}/>
                </EditorRow>
              </View>:null}

              {pageKey==='home'&&frame.key==='holding-quotes'?<HoldingMarketWallEditor
                value={displayDraft.holdingWall??DEFAULT_HOLDING_WALL_CONFIG}
                onChange={holdingWall=>setDisplayDraft(current=>({...current,holdingWall}))}
                miniSource={monitor.config}
              />:null}

              <Text style={styles.rule}>B 層只管理「{frame.title}」，不可直接改動其他框架。</Text>
            </View> : null}
          </View>;
        })}
      </ScrollView>
    </View>
  </Modal>;
}

function EditorRow({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <View style={styles.editorRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{title}</Text>
      <Text style={styles.rowHint}>{subtitle}</Text>
    </View>
    <View style={styles.editorControl}>{children}</View>
  </View>;
}

function ChoiceGroup<T extends string>({
  items,
  value,
  onChange,
  disabled = false,
}: {
  items: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return <View style={styles.choiceGroup}>
    {items.map(item => <Pressable
      key={item.key}
      disabled={disabled}
      onPress={() => onChange(item.key)}
      style={[styles.choice, value === item.key && styles.choiceActive, disabled && styles.disabled]}
    >
      <Text style={[styles.choiceText, value === item.key && styles.choiceTextActive]}>{item.label}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  top:{paddingTop:56,paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  kicker:{fontSize:12,fontWeight:'800',color:colors.primary},
  title:{fontSize:26,fontWeight:'900',color:colors.text,marginTop:4},
  hint:{fontSize:12,color:colors.textSecondary,lineHeight:18,marginTop:5},
  cancel:{paddingHorizontal:12,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  cancelText:{color:colors.textSecondary,fontWeight:'800'},
  save:{paddingHorizontal:14,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.primary},
  saveText:{color:'#FFFFFF',fontWeight:'800'},
  content:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},
  toolbar:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.md},
  toolbarText:{flex:1,fontSize:10,lineHeight:15,color:colors.textSecondary},
  resetText:{fontSize:11,fontWeight:'900',color:colors.primary},
  section:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,overflow:'hidden'},
  header:{padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},
  headerActions:{flexDirection:'row',alignItems:'center',gap:10},
  sectionTitle:{fontSize:17,fontWeight:'900',color:colors.text},
  description:{fontSize:12,color:colors.textSecondary,marginTop:4},
  toggle:{fontSize:25,color:colors.primary,fontWeight:'600'},
  body:{paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  editorRow:{paddingVertical:13,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border,gap:10},
  rowLabel:{fontWeight:'800',color:colors.text},
  rowHint:{fontSize:10,color:colors.textSecondary,marginTop:3,lineHeight:15},
  editorControl:{marginTop:7},
  choiceGroup:{flexDirection:'row',flexWrap:'wrap',gap:6},
  choice:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:'#FFFFFF'},
  orderRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12},
  orderButton:{paddingHorizontal:12,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  orderText:{fontSize:11,fontWeight:'900',color:colors.primary},
  orderIndex:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  disabled:{opacity:0.35},
  newsEditor:{gap:4},
  rule:{fontSize:11,lineHeight:17,color:colors.primary,marginTop:4,fontWeight:'700'},
});

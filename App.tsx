import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addInventoryItem,
  adjustInventory,
  deleteInventoryItem,
  initializeInventory,
  listInventory,
} from './src/database';
import {type InventoryItem} from './src/inventory';

type AppState =
  | {status: 'loading'}
  | {status: 'ready'}
  | {status: 'error'; message: string};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>({status: 'loading'});
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(
    async (term = search) => {
      setItems(await listInventory(term));
    },
    [search],
  );

  useEffect(() => {
    let mounted = true;
    initializeInventory()
      .then(() => listInventory())
      .then(loadedItems => {
        if (mounted) {
          setItems(loadedItems);
          setAppState({status: 'ready'});
        }
      })
      .catch(error => {
        if (mounted) {
          setAppState({status: 'error', message: messageFrom(error)});
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (appState.status !== 'ready') {
      return;
    }
    const timer = setTimeout(() => {
      refresh(search).catch(error =>
        Alert.alert('Search failed', messageFrom(error)),
      );
    }, 180);
    return () => clearTimeout(timer);
  }, [appState.status, refresh, search]);

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const adjust = async (item: InventoryItem, amount: number) => {
    try {
      await adjustInventory(item.id, amount);
      await refresh();
    } catch (error) {
      Alert.alert('Could not update stock', messageFrom(error));
    }
  };

  const remove = (item: InventoryItem) => {
    Alert.alert('Delete item?', `${item.name} (${item.sku}) will be removed.`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInventoryItem(item.id);
            await refresh();
          } catch (error) {
            Alert.alert('Could not delete item', messageFrom(error));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SQLITE.ENCRYPTED · OFFLINE</Text>
          <Text style={styles.title}>Inventory</Text>
        </View>
        <View style={styles.lockBadge}>
          <Text style={styles.lock}>▣</Text>
        </View>
      </View>

      {appState.status === 'loading' ? (
        <View style={styles.centered}>
          <Text style={styles.loadingTitle}>Opening encrypted inventory…</Text>
          <Text style={styles.muted}>Activating SEE and checking the key</Text>
        </View>
      ) : appState.status === 'error' ? (
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorTitle}>
              SQLite.Encrypted could not start
            </Text>
            <Text selectable style={styles.errorText}>
              {appState.message}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <View>
              <Text style={styles.summaryNumber}>{totalUnits}</Text>
              <Text style={styles.summaryLabel}>units on hand</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.summaryNumber}>{items.length}</Text>
              <Text style={styles.summaryLabel}>matching items</Text>
            </View>
          </View>

          <TextInput
            accessibilityLabel="Search inventory"
            onChangeText={setSearch}
            placeholder="Search SKU, name, or location"
            placeholderTextColor={colors.subtle}
            style={styles.search}
            value={search}
          />

          <FlatList
            contentContainerStyle={
              items.length === 0 ? styles.emptyList : styles.list
            }
            data={items}
            keyExtractor={item => String(item.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No inventory items</Text>
                <Text style={styles.muted}>
                  Add an item to create the first encrypted record.
                </Text>
              </View>
            }
            renderItem={({item}) => (
              <InventoryCard
                item={item}
                onDecrease={() => adjust(item, -1)}
                onDelete={() => remove(item)}
                onIncrease={() => adjust(item, 1)}
              />
            )}
          />

          <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
            <Text style={styles.addButtonText}>＋ Add inventory item</Text>
          </Pressable>
        </>
      )}

      <AddItemModal
        visible={adding}
        onCancel={() => setAdding(false)}
        onSave={async item => {
          await addInventoryItem(item);
          setAdding(false);
          await refresh();
        }}
      />
    </SafeAreaView>
  );
}

function InventoryCard({
  item,
  onDecrease,
  onDelete,
  onIncrease,
}: {
  item: InventoryItem;
  onDecrease: () => void;
  onDelete: () => void;
  onIncrease: () => void;
}): React.JSX.Element {
  const lowStock = item.quantity <= 3;
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTopRow}>
        <View style={styles.itemIdentity}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {item.sku} · {item.location}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Delete ${item.name}`}
          onPress={onDelete}>
          <Text style={styles.deleteButton}>Delete</Text>
        </Pressable>
      </View>
      <View style={styles.stockRow}>
        <View style={[styles.stockBadge, lowStock && styles.lowStockBadge]}>
          <Text style={[styles.stockText, lowStock && styles.lowStockText]}>
            {lowStock ? 'LOW STOCK' : 'IN STOCK'}
          </Text>
        </View>
        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel={`Decrease ${item.name}`}
            onPress={onDecrease}
            style={styles.stepButton}>
            <Text style={styles.stepButtonText}>−</Text>
          </Pressable>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <Pressable
            accessibilityLabel={`Increase ${item.name}`}
            onPress={onIncrease}
            style={styles.stepButton}>
            <Text style={styles.stepButtonText}>＋</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type ItemDraft = {
  sku: string;
  name: string;
  quantity: number;
  location: string;
};

function AddItemModal({
  visible,
  onCancel,
  onSave,
}: {
  visible: boolean;
  onCancel: () => void;
  onSave: (item: ItemDraft) => Promise<void>;
}): React.JSX.Element {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsedQuantity = Number(quantity);
    try {
      setSaving(true);
      await onSave({sku, name, quantity: parsedQuantity, location});
      setSku('');
      setName('');
      setQuantity('0');
      setLocation('');
    } catch (error) {
      Alert.alert('Could not save item', messageFrom(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add inventory item</Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={setSku}
            placeholder="SKU"
            placeholderTextColor={colors.subtle}
            style={styles.input}
            value={sku}
          />
          <TextInput
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor={colors.subtle}
            style={styles.input}
            value={name}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={setQuantity}
            placeholder="Starting quantity"
            placeholderTextColor={colors.subtle}
            style={styles.input}
            value={quantity}
          />
          <TextInput
            onChangeText={setLocation}
            placeholder="Storage location"
            placeholderTextColor={colors.subtle}
            style={styles.input}
            value={location}
          />
          <View style={styles.modalActions}>
            <Pressable
              disabled={saving}
              onPress={onCancel}
              style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={save} style={styles.save}>
              <Text style={styles.saveText}>
                {saving ? 'Saving…' : 'Save item'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const colors = {
  canvas: '#f5f1e8',
  ink: '#123b32',
  muted: '#52675f',
  subtle: '#7d8a85',
  primary: '#176b57',
  primarySoft: '#d9ebe4',
  border: '#d8d5ca',
  white: '#fffdf8',
  warning: '#a1462f',
  warningSoft: '#f8ddd3',
  error: '#8f2e25',
  errorSoft: '#f8d7d3',
};

const styles = StyleSheet.create({
  screen: {backgroundColor: colors.canvas, flex: 1},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 2},
  lockBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  lock: {color: colors.primary, fontSize: 22},
  centered: {flex: 1, justifyContent: 'center', padding: 24},
  loadingTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorCard: {backgroundColor: colors.errorSoft, borderRadius: 18, padding: 24},
  errorIcon: {
    color: colors.error,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 10,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  summaryNumber: {color: colors.white, fontSize: 27, fontWeight: '800'},
  summaryLabel: {color: '#d8eee7', fontSize: 12, marginTop: 2},
  summaryDivider: {backgroundColor: '#5c9b89', marginHorizontal: 26, width: 1},
  search: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginHorizontal: 22,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  list: {padding: 22, paddingBottom: 104},
  emptyList: {flexGrow: 1, justifyContent: 'center', padding: 22},
  empty: {alignItems: 'center'},
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 11,
    padding: 16,
  },
  itemTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemIdentity: {flex: 1, paddingRight: 12},
  itemName: {color: colors.ink, fontSize: 17, fontWeight: '700'},
  itemMeta: {color: colors.muted, fontSize: 13, marginTop: 4},
  deleteButton: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
    padding: 4,
  },
  stockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stockBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lowStockBadge: {backgroundColor: colors.warningSoft},
  stockText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  lowStockText: {color: colors.warning},
  stepper: {alignItems: 'center', flexDirection: 'row'},
  stepButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepButtonText: {color: colors.primary, fontSize: 20, fontWeight: '700'},
  quantity: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 52,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    bottom: 20,
    left: 22,
    padding: 16,
    position: 'absolute',
    right: 22,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(14, 38, 32, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 30,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalActions: {flexDirection: 'row', gap: 10, marginTop: 8},
  cancel: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  cancelText: {color: colors.ink, fontWeight: '700'},
  save: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    padding: 14,
  },
  saveText: {color: colors.white, fontWeight: '800'},
});

export default App;

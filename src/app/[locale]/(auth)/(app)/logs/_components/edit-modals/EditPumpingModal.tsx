'use client';

import type { PumpingAmountMode } from '@/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/hooks/usePumpingFormState';
import type { PumpingAmountSettingsState } from '@/components/settings/PumpingAmountSettingsPanel';
import type { LocalPumpingLog } from '@/lib/local-db';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DualAmountSwiper } from '@/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/components';
import { BaseActivityModal } from '@/components/activity-modals/BaseActivityModal';
import { DualTimeSwiper } from '@/components/feed/time-swiper/DualTimeSwiper';
import { NotesField, SectionDivider } from '@/components/input-controls';
import { DEFAULT_PUMPING_AMOUNT_SETTINGS } from '@/components/settings/PumpingAmountSettingsPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { notifyToast } from '@/lib/notify';
import { deletePumpingLog, updatePumpingLog } from '@/services/operations/pumping-log';
import { useUserStore } from '@/stores/useUserStore';

type EditPumpingModalProps = {
  pumping: LocalPumpingLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditPumpingModal({
  pumping,
  open,
  onOpenChange,
  onSuccess,
}: EditPumpingModalProps) {
  const user = useUserStore(s => s.user);

  // Derive initial mode from data
  const isLeftRight = pumping.leftMl != null && pumping.rightMl != null;

  // Form state
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');
  const [startTime, setStartTime] = useState(pumping.startedAt);
  const [endTime, setEndTime] = useState(pumping.endedAt ?? pumping.startedAt);
  const [mode, setMode] = useState<PumpingAmountMode>(isLeftRight ? 'leftRight' : 'total');
  const [leftMl, setLeftMl] = useState(pumping.leftMl ?? 0);
  const [rightMl, setRightMl] = useState(pumping.rightMl ?? 0);
  const [totalMl, setTotalMl] = useState(pumping.totalMl);
  const [notes, setNotes] = useState(pumping.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!pumping.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pumping settings state
  const [pumpingSettings, setPumpingSettings] = useState<PumpingAmountSettingsState>(DEFAULT_PUMPING_AMOUNT_SETTINGS);

  // Load hand mode preference and pumping settings
  useEffect(() => {
    async function loadConfig() {
      if (!user?.localId) {
        return;
      }
      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.data.handMode ?? 'right');

        // Load pumping settings
        const storedPumpingSettings = config.data.pumpingAmount;
        const settings: PumpingAmountSettingsState = {
          defaultAmountMl: storedPumpingSettings?.defaultAmountMl ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.defaultAmountMl,
          maxAmountMl: storedPumpingSettings?.maxAmountMl ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.maxAmountMl,
          maxTotalMl: storedPumpingSettings?.maxTotalMl ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.maxTotalMl,
          increment: storedPumpingSettings?.increment ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.increment,
          dragStep: storedPumpingSettings?.dragStep ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.dragStep,
          startOnLeft: storedPumpingSettings?.startOnLeft ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.startOnLeft,
        };
        setPumpingSettings(settings);
      } catch (err) {
        console.error('Failed to load config:', err);
      }
    }
    loadConfig();
  }, [user?.localId]);

  // Update state when pumping log changes
  useEffect(() => {
    const lr = pumping.leftMl != null && pumping.rightMl != null;
    setStartTime(pumping.startedAt);
    setEndTime(pumping.endedAt ?? pumping.startedAt);
    setMode(lr ? 'leftRight' : 'total');
    setLeftMl(pumping.leftMl ?? 0);
    setRightMl(pumping.rightMl ?? 0);
    setTotalMl(pumping.totalMl);
    setNotes(pumping.notes ?? '');
    setNotesVisible(!!pumping.notes);
    setError(null);
  }, [pumping.id, pumping.startedAt, pumping.endedAt, pumping.leftMl, pumping.rightMl, pumping.totalMl, pumping.notes]);

  const handleSettingsChange = useCallback(async (newSettings: PumpingAmountSettingsState) => {
    // Update local state immediately
    setPumpingSettings(newSettings);

    // Persist to IndexedDB
    if (user?.localId) {
      try {
        await updateUIConfig(user.localId, { pumpingAmount: newSettings });
        toast.success('Settings updated');
      } catch (err) {
        console.error('Failed to save pumping settings:', err);
        toast.error('Failed to save settings');
      }
    }
  }, [user?.localId]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const isLR = mode === 'leftRight';
      const computedTotal = isLR ? leftMl + rightMl : totalMl;

      const result = await updatePumpingLog({
        id: pumping.id,
        babyId: pumping.babyId,
        startedAt: startTime,
        endedAt: endTime,
        leftMl: isLR ? leftMl : null,
        rightMl: isLR ? rightMl : null,
        totalMl: computedTotal,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      notifyToast.success('Pumping log updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update pumping log';
      setError(message);
      notifyToast.error(message);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deletePumpingLog(pumping.id, pumping.babyId);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Pumping log deleted');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete pumping log';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Pumping"
        open={open}
        onOpenChange={onOpenChange}
        onPrimary={handleSubmit}
        primaryLabel="Update"
        onSecondary={() => onOpenChange(false)}
        secondaryLabel="Cancel"
        onDelete={() => setShowDeleteConfirm(true)}
        isLoading={isSubmitting}
        error={error}
        handMode={handMode}
      >
        {/* Dual Time Picker */}
        <DualTimeSwiper
          startTime={startTime}
          onStartTimeChange={setStartTime}
          endTime={endTime}
          onEndTimeChange={setEndTime}
          handMode={handMode}
        />

        <SectionDivider />

        {/* Amount Section with mode tabs and sliders */}
        <DualAmountSwiper
          mode={mode}
          onModeChange={setMode}
          leftMl={leftMl}
          onLeftMlChange={setLeftMl}
          rightMl={rightMl}
          onRightMlChange={setRightMl}
          totalMl={totalMl}
          onTotalMlChange={setTotalMl}
          handMode={handMode}
          settings={pumpingSettings}
          onSettingsChange={handleSettingsChange}
        />

        <SectionDivider />

        {/* Notes */}
        <NotesField
          value={notes}
          onChange={setNotes}
          visible={notesVisible}
          onToggleVisible={() => setNotesVisible(!notesVisible)}
          placeholder="Any notes about this pumping session?"
          handMode={handMode}
        />
      </BaseActivityModal>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pumping log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this pumping log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

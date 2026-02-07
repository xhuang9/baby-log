'use client';

import type { AddPumpingModalProps } from './types';
import type { PumpingAmountSettingsState } from '@/components/settings/PumpingAmountSettingsPanel';
import { ChevronLeftIcon } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { DualTimeSwiper } from '@/components/feed/time-swiper/DualTimeSwiper';
import { FormFooter, NotesField, SectionDivider } from '@/components/input-controls';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';
import { DualAmountSwiper } from './components';
import {
  useInitializePumpingForm,
  usePumpingFormState,
  usePumpingFormSubmit,
} from './hooks';

export function AddPumpingModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddPumpingModalProps) {
  const user = useUserStore(s => s.user);
  const { state, actions } = usePumpingFormState();

  useInitializePumpingForm({
    setHandMode: actions.setHandMode,
    setLeftMl: actions.setLeftMl,
    setRightMl: actions.setRightMl,
    setTotalMl: actions.setTotalMl,
    setPumpingSettings: actions.setPumpingSettings,
  });

  const { handleSubmit, isSubmitting, error } = usePumpingFormSubmit({
    babyId,
    startTime: state.startTime,
    endTime: state.endTime,
    mode: state.mode,
    leftMl: state.leftMl,
    rightMl: state.rightMl,
    totalMl: state.totalMl,
    notes: state.notes,
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      actions.resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSettingsChange = useCallback(async (newSettings: PumpingAmountSettingsState) => {
    // Update local state immediately
    actions.setPumpingSettings(newSettings);

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
  }, [user?.localId, actions]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-0 flex h-full w-full flex-col gap-0 rounded-none p-0"
        showCloseButton={false}
      >
        <SheetHeader className="relative mx-auto w-full max-w-150 shrink-0 flex-row items-center space-y-0 border-b px-4 pt-4 pb-4">
          <SheetClose
            render={(
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
              />
            )}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="absolute left-1/2 -translate-x-1/2">
            Add Pumping
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-150 flex-1 space-y-5 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {/* Dual Time Picker (Start + End) */}
          <DualTimeSwiper
            startTime={state.startTime}
            onStartTimeChange={actions.setStartTime}
            endTime={state.endTime}
            onEndTimeChange={actions.setEndTime}
            handMode={state.handMode}
          />

          <SectionDivider />

          {/* Amount Section with mode tabs and sliders */}
          <DualAmountSwiper
            mode={state.mode}
            onModeChange={actions.setMode}
            leftMl={state.leftMl}
            onLeftMlChange={actions.setLeftMl}
            rightMl={state.rightMl}
            onRightMlChange={actions.setRightMl}
            totalMl={state.totalMl}
            onTotalMlChange={actions.setTotalMl}
            handMode={state.handMode}
            settings={state.pumpingSettings}
            onSettingsChange={handleSettingsChange}
          />

          <SectionDivider />

          {/* Notes */}
          <NotesField
            value={state.notes}
            onChange={actions.setNotes}
            visible={state.notesVisible}
            onToggleVisible={() => actions.setNotesVisible(!state.notesVisible)}
            placeholder="Any notes about this pumping session?"
            handMode={state.handMode}
          />

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter
          className={`mx-auto w-full max-w-150 shrink-0 flex-row border-t px-4 pt-4 pb-4 ${state.handMode === 'left' ? 'justify-start' : 'justify-end'}`}
        >
          <FormFooter
            onPrimary={handleSubmit}
            primaryLabel="Save"
            onSecondary={() => handleOpenChange(false)}
            secondaryLabel="Cancel"
            isLoading={isSubmitting}
            handMode={state.handMode}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
